'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [fullName, setFullName] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		if (password.length < 8) {
			setError('Lösenordet måste vara minst 8 tecken');
			setLoading(false);
			return;
		}

		try {
			const res = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, fullName }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Något gick fel');
			}

			// Redirect to verify email page
			router.push('/verify-email?email=' + encodeURIComponent(email));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ett fel uppstod vid registrering');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
						EP Time Tracker
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Skapa ett nytt konto
					</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleSignUp}>
					<div className="rounded-md shadow-sm space-y-4">
						<div>
							<label htmlFor="fullName" className="sr-only">
								Fullständigt namn
							</label>
							<input
								id="fullName"
								name="fullName"
								type="text"
								autoComplete="name"
								required
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
								placeholder="Fullständigt namn"
							/>
						</div>
						<div>
							<label htmlFor="email" className="sr-only">
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
								className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
								placeholder="E-postadress"
							/>
						</div>
						<div>
							<label htmlFor="password" className="sr-only">
								Lösenord
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="new-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
								placeholder="Lösenord (minst 8 tecken)"
							/>
						</div>
					</div>

					{error && (
						<div className="rounded-md bg-red-50 p-4">
							<p className="text-sm text-red-800">{error}</p>
						</div>
					)}

					<div>
						<button
							type="submit"
							disabled={loading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Skapar konto...' : 'Skapa konto'}
						</button>
					</div>

					<div className="text-sm text-center">
						<Link
							href="/sign-in"
							className="font-medium text-blue-600 hover:text-blue-500"
						>
							Har du redan ett konto? Logga in här
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}

