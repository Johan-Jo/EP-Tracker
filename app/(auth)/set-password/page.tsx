'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SetPasswordPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [email, setEmail] = useState<string | null>(null);

	useEffect(() => {
		async function checkInviteStatus() {
			try {
				const supabase = createClient();
				
				// Check if user has a valid session from invite token
				const { data: { session }, error: sessionError } = await supabase.auth.getSession();
				
				console.log('Session check:', { session: !!session, error: sessionError });

				if (sessionError || !session) {
					setError('Ogiltig eller utgången inbjudan. Be om en ny inbjudan.');
					setLoading(false);
					return;
				}

				// Check if user already has a password set
				const { data: { user } } = await supabase.auth.getUser();
				
				if (!user) {
					setError('Ingen användare hittades. Be om en ny inbjudan.');
					setLoading(false);
					return;
				}

				setEmail(user.email || null);

				// Check if this is actually an invite (user should not have confirmed email yet when first setting password)
				// But since they have a session, we'll let them set password
				setLoading(false);
			} catch (err) {
				console.error('Error checking invite status:', err);
				setError('Ett oväntat fel uppstod');
				setLoading(false);
			}
		}

		checkInviteStatus();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validation
		if (password.length < 8) {
			setError('Lösenordet måste vara minst 8 tecken');
			return;
		}

		if (password !== confirmPassword) {
			setError('Lösenorden matchar inte');
			return;
		}

		setSubmitting(true);

		try {
			const supabase = createClient();

			// Update password
			const { error: updateError } = await supabase.auth.updateUser({
				password: password,
			});

			if (updateError) {
				throw updateError;
			}

			console.log('Password set successfully!');
			
			// Redirect to welcome
			router.push('/welcome');
		} catch (err: any) {
			console.error('Error setting password:', err);
			setError(err.message || 'Misslyckades att sätta lösenord');
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
				<div className="text-center">
					<Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto" />
					<p className="text-gray-600 text-lg mt-4">Kontrollerar inbjudan...</p>
				</div>
			</div>
		);
	}

	if (error && !email) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white p-4">
				<div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
					<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<Lock className="w-8 h-8 text-red-600" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">Ogiltig inbjudan</h1>
					<p className="text-gray-600 mb-6">{error}</p>
					<Button onClick={() => router.push('/sign-in')} className="w-full">
						Gå till inloggning
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white p-4">
			<div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
				<div className="text-center mb-8">
					<div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<Lock className="w-8 h-8 text-orange-600" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">Sätt ditt lösenord</h1>
					<p className="text-gray-600">
						Välkommen! Skapa ett lösenord för ditt konto.
					</p>
					{email && (
						<p className="text-sm text-gray-500 mt-2">
							{email}
						</p>
					)}
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{error && (
						<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-sm text-red-600">{error}</p>
						</div>
					)}

					<div>
						<Label htmlFor="password">Nytt lösenord</Label>
						<div className="relative mt-1">
							<Input
								id="password"
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Minst 8 tecken"
								required
								className="pr-10"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
							>
								{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
							</button>
						</div>
						<p className="text-xs text-gray-500 mt-1">
							Använd minst 8 tecken med en blandning av bokstäver och siffror
						</p>
					</div>

					<div>
						<Label htmlFor="confirmPassword">Bekräfta lösenord</Label>
						<Input
							id="confirmPassword"
							type={showPassword ? 'text' : 'password'}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Ange lösenordet igen"
							required
							className="mt-1"
						/>
					</div>

					<Button
						type="submit"
						disabled={submitting}
						className="w-full"
					>
						{submitting ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Sparar...
							</>
						) : (
							'Fortsätt'
						)}
					</Button>
				</form>
			</div>
		</div>
	);
}

