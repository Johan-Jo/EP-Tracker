'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, Mail, Shield, Zap } from 'lucide-react';

function SignInContent() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');
	const router = useRouter();
	const searchParams = useSearchParams();

	// Check for error messages from URL
	useEffect(() => {
		const errorParam = searchParams.get('error');
		if (errorParam === 'link_expired') {
			setError('Verifieringslänken har gått ut eller redan använts. Vänligen logga in eller begär en ny länk.');
		} else if (errorParam === 'auth_callback_error') {
			setError('Ett fel uppstod vid verifiering. Vänligen försök logga in.');
		}
	}, [searchParams]);

	const handleSignIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		setMessage('');

		try {
			const res = await fetch('/api/auth/signin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Något gick fel');
			}

			setMessage('Loggar in...');
			router.push('/');
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ett fel uppstod vid inloggning');
		} finally {
			setLoading(false);
		}
	};

	const handleMagicLink = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		setMessage('');

		try {
			const res = await fetch('/api/auth/magic-link', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Något gick fel');
			}

			setMessage('En inloggningslänk har skickats till din e-post!');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ett fel uppstod');
		} finally {
			setLoading(false);
		}
	};

	const benefits = [
		{
			icon: Clock,
			text: 'Spara 5+ timmar per vecka på administration',
		},
		{
			icon: Zap,
			text: 'Snabbare fakturaunderlag och lönerapporter',
		},
		{
			icon: Shield,
			text: 'Säker och trygg datalagring i molnet',
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 relative overflow-hidden">
			{/* Decorative circles */}
			<div className="absolute right-0 top-0 -mr-40 -mt-40 h-80 w-80 rounded-full bg-orange-200 opacity-20 blur-3xl" />
			<div className="absolute bottom-0 left-0 -mb-40 -ml-40 h-80 w-80 rounded-full bg-blue-200 opacity-20 blur-3xl" />

			<div className="relative flex min-h-screen">
				{/* Left side - Welcome back message */}
				<div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20">
					<div className="max-w-xl">
						<Link href="/" className="inline-block mb-8">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
									<Clock className="h-6 w-6 text-white" />
								</div>
								<span className="text-2xl font-bold text-gray-900">EP-Tracker</span>
							</div>
						</Link>

						<h1 className="text-4xl font-bold text-gray-900 mb-4">
							Välkommen tillbaka!
						</h1>
						<p className="text-xl text-gray-600 mb-12">
							Logga in för att fortsätta hantera dina projekt, tidrapporter och team.
						</p>

						<div className="space-y-4">
							{benefits.map((benefit, index) => (
								<div key={index} className="flex items-center gap-4">
									<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 flex-shrink-0">
										<benefit.icon className="h-5 w-5 text-orange-600" />
									</div>
									<p className="text-gray-700">{benefit.text}</p>
								</div>
							))}
						</div>

						<div className="mt-12 pt-8 border-t border-gray-200">
							<p className="text-sm text-gray-600">
								Över 100+ byggföretag använder redan EP-Tracker för att effektivisera sin tidrapportering
							</p>
						</div>
					</div>
				</div>

				{/* Right side - Sign in form */}
				<div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
					<div className="w-full max-w-md">
						{/* Mobile logo */}
						<Link href="/" className="lg:hidden inline-block mb-8">
							<div className="flex items-center justify-center gap-3">
								<div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
									<Clock className="h-6 w-6 text-white" />
								</div>
								<span className="text-2xl font-bold text-gray-900">EP-Tracker</span>
							</div>
						</Link>

						<div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-10">
							<div className="mb-8">
								<h2 className="text-3xl font-bold text-gray-900">
									Logga in
								</h2>
								<p className="mt-2 text-gray-600">
									Fortsätt där du slutade
								</p>
							</div>

							<form onSubmit={handleSignIn} className="space-y-5">
								<div>
									<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
										E-postadress
									</label>
									<input
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										required
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
										placeholder="din@email.se"
									/>
								</div>

								<div>
									<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
										Lösenord
									</label>
									<input
										id="password"
										name="password"
										type="password"
										autoComplete="current-password"
										required
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
										placeholder="Ange ditt lösenord"
									/>
								</div>

								{error && (
									<div className="rounded-xl bg-red-50 border border-red-200 p-4">
										<p className="text-sm text-red-800">{error}</p>
									</div>
								)}

								{message && (
									<div className="rounded-xl bg-green-50 border border-green-200 p-4">
										<p className="text-sm text-green-800">{message}</p>
									</div>
								)}

								<div className="space-y-3">
									<button
										type="submit"
										disabled={loading}
										className="w-full py-3.5 px-4 rounded-xl text-white font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
									>
										{loading ? 'Loggar in...' : 'Logga in'}
									</button>

									<div className="relative">
										<div className="absolute inset-0 flex items-center">
											<div className="w-full border-t border-gray-300"></div>
										</div>
										<div className="relative flex justify-center text-sm">
											<span className="px-2 bg-white text-gray-500">Eller</span>
										</div>
									</div>

									<button
										type="button"
										onClick={handleMagicLink}
										disabled={loading || !email}
										className="w-full py-3.5 px-4 rounded-xl text-gray-700 font-medium bg-white border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
									>
										<Mail className="h-4 w-4" />
										Skicka inloggningslänk
									</button>
								</div>
							</form>
						</div>

						<p className="mt-6 text-center text-sm text-gray-600">
							Inget konto ännu?{' '}
							<Link
								href="/sign-up"
								className="font-semibold text-orange-600 hover:text-orange-700 transition-colors"
							>
								Registrera dig gratis
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function SignInPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50">
					<div className="text-center">
						<Clock className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
						<p className="text-gray-600">Laddar...</p>
					</div>
				</div>
			}
		>
			<SignInContent />
		</Suspense>
	);
}

