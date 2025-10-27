'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export function ChangePasswordForm() {
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		// Validate passwords match
		if (newPassword !== confirmPassword) {
			setError('De nya lösenorden matchar inte');
			return;
		}

		// Validate password length
		if (newPassword.length < 8) {
			setError('Det nya lösenordet måste vara minst 8 tecken långt');
			return;
		}

		// Validate password strength
		const hasUpperCase = /[A-Z]/.test(newPassword);
		const hasLowerCase = /[a-z]/.test(newPassword);
		const hasNumber = /[0-9]/.test(newPassword);

		if (!hasUpperCase || !hasLowerCase || !hasNumber) {
			setError('Lösenordet måste innehålla stora och små bokstäver samt siffror');
			return;
		}

		setLoading(true);

		try {
			const res = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword,
					newPassword,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Något gick fel');
			}

			setSuccess('Lösenordet har uppdaterats!');
			// Clear form
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');

			// Clear success message after 5 seconds
			setTimeout(() => setSuccess(''), 5000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ett fel uppstod');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
			<CardHeader>
				<div className='flex items-center gap-2'>
					<Lock className='h-5 w-5 text-gray-600 dark:text-gray-400' />
					<CardTitle className='text-gray-900 dark:text-white'>Säkerhet</CardTitle>
				</div>
				<CardDescription className='text-gray-600 dark:text-gray-400'>
					Byt ditt lösenord för att hålla ditt konto säkert
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className='space-y-4'>
					{/* Error message */}
					{error && (
						<div className='flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400'>
							<AlertCircle className='h-4 w-4 flex-shrink-0' />
							<span>{error}</span>
						</div>
					)}

					{/* Success message */}
					{success && (
						<div className='flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400'>
							<CheckCircle2 className='h-4 w-4 flex-shrink-0' />
							<span>{success}</span>
						</div>
					)}

					{/* Current Password */}
					<div className='space-y-2'>
						<Label htmlFor='current-password'>Nuvarande lösenord</Label>
						<div className='relative'>
							<Input
								id='current-password'
								type={showCurrentPassword ? 'text' : 'password'}
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								required
								className='pr-10'
								placeholder='Ange ditt nuvarande lösenord'
							/>
							<button
								type='button'
								onClick={() => setShowCurrentPassword(!showCurrentPassword)}
								className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
							>
								{showCurrentPassword ? (
									<EyeOff className='h-4 w-4' />
								) : (
									<Eye className='h-4 w-4' />
								)}
							</button>
						</div>
					</div>

					{/* New Password */}
					<div className='space-y-2'>
						<Label htmlFor='new-password'>Nytt lösenord</Label>
						<div className='relative'>
							<Input
								id='new-password'
								type={showNewPassword ? 'text' : 'password'}
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
								className='pr-10'
								placeholder='Minst 8 tecken, inkl. stor bokstav och siffra'
							/>
							<button
								type='button'
								onClick={() => setShowNewPassword(!showNewPassword)}
								className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
							>
								{showNewPassword ? (
									<EyeOff className='h-4 w-4' />
								) : (
									<Eye className='h-4 w-4' />
								)}
							</button>
						</div>
						{newPassword && (
							<div className='space-y-1 text-xs'>
								<p className={newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
									✓ Minst 8 tecken
								</p>
								<p className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
									✓ Stor bokstav
								</p>
								<p className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
									✓ Liten bokstav
								</p>
								<p className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
									✓ Siffra
								</p>
							</div>
						)}
					</div>

					{/* Confirm Password */}
					<div className='space-y-2'>
						<Label htmlFor='confirm-password'>Bekräfta nytt lösenord</Label>
						<div className='relative'>
							<Input
								id='confirm-password'
								type={showConfirmPassword ? 'text' : 'password'}
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								className='pr-10'
								placeholder='Upprepa ditt nya lösenord'
							/>
							<button
								type='button'
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
							>
								{showConfirmPassword ? (
									<EyeOff className='h-4 w-4' />
								) : (
									<Eye className='h-4 w-4' />
								)}
							</button>
						</div>
						{confirmPassword && newPassword !== confirmPassword && (
							<p className='text-xs text-red-600'>Lösenorden matchar inte</p>
						)}
					</div>

					<div className='flex justify-end pt-4'>
						<Button
							type='submit'
							disabled={loading}
							className='bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600'
						>
							{loading ? 'Uppdaterar...' : 'Uppdatera lösenord'}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}


