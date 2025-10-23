'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function CompleteSetupPage() {
	const [companyName, setCompanyName] = useState('');
	const [orgNumber, setOrgNumber] = useState('');
	const [phone, setPhone] = useState('');
	const [address, setAddress] = useState('');
	const [postalCode, setPostalCode] = useState('');
	const [city, setCity] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [userId, setUserId] = useState('');
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		// Check if user is logged in
		const checkUser = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				router.push('/sign-in');
				return;
			}
			setUserId(user.id);

			// Check if user already has an organization (invited users)
			const { data: membership } = await supabase
				.from('memberships')
				.select('id, role')
				.eq('user_id', user.id)
				.eq('is_active', true)
				.single();

			if (membership) {
				// User was invited and already has organization, redirect to welcome
				router.push('/welcome');
				return;
			}
		};

		checkUser();

		// Load saved data from localStorage if available
		const savedData = localStorage.getItem('signup_step2');
		if (savedData) {
			const data = JSON.parse(savedData);
			setCompanyName(data.companyName || '');
			setOrgNumber(data.orgNumber || '');
			setPhone(data.phone || '');
			setAddress(data.address || '');
			setPostalCode(data.postalCode || '');
			setCity(data.city || '');
		}
	}, [router, supabase]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			const res = await fetch('/api/auth/complete-organization', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					companyName,
					orgNumber,
					phone,
					address,
					postalCode,
					city,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Något gick fel');
			}

			// Clear localStorage
			localStorage.removeItem('signup_step1');
			localStorage.removeItem('signup_step2');
			localStorage.removeItem('signup_userId');

			// Redirect to dashboard
			router.push('/dashboard');
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ett fel uppstod');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 relative overflow-hidden flex items-center justify-center px-4 py-12">
			{/* Decorative circles */}
			<div className="absolute right-0 top-0 -mr-40 -mt-40 h-80 w-80 rounded-full bg-orange-200 opacity-20 blur-3xl" />
			<div className="absolute bottom-0 left-0 -mb-40 -ml-40 h-80 w-80 rounded-full bg-blue-200 opacity-20 blur-3xl" />

			<div className="relative w-full max-w-md">
				<Link href="/" className="inline-block mb-8">
					<div className="flex items-center justify-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
							<Clock className="h-6 w-6 text-white" />
						</div>
						<span className="text-2xl font-bold text-gray-900">EP-Tracker</span>
					</div>
				</Link>

				<div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-10">
					<div className="flex items-center justify-center mb-6">
						<div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
							<Building2 className="h-8 w-8 text-orange-600" />
						</div>
					</div>

					<div className="mb-8 text-center">
						<h2 className="text-3xl font-bold text-gray-900">Ett steg kvar!</h2>
						<p className="mt-2 text-gray-600">
							Berätta lite om ditt företag för att slutföra registreringen
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label
								htmlFor="companyName"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Företagets namn
							</label>
							<input
								id="companyName"
								name="companyName"
								type="text"
								required
								value={companyName}
								onChange={(e) => setCompanyName(e.target.value)}
								className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
								placeholder="Ditt företags namn"
							/>
						</div>

						<div>
							<label
								htmlFor="orgNumber"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Organisationsnummer
							</label>
							<input
								id="orgNumber"
								name="orgNumber"
								type="text"
								required
								value={orgNumber}
								onChange={(e) => setOrgNumber(e.target.value)}
								className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
								placeholder="XXXXXX-XXXX"
							/>
						</div>

						<div>
							<label
								htmlFor="phone"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Telefonnummer
							</label>
							<input
								id="phone"
								name="phone"
								type="tel"
								inputMode="tel"
								pattern="[\d\s\-\+]+"
								required
								value={phone}
								onChange={(e) => {
									const value = e.target.value;
									// Only allow +, digits, spaces, and hyphens
									if (/^[\d\s\-\+]*$/.test(value)) {
										setPhone(value);
									}
								}}
								className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
								placeholder="+46 70-123 45 67"
							/>
						</div>

						<div>
							<label
								htmlFor="address"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Gatuadress
							</label>
							<input
								id="address"
								name="address"
								type="text"
								required
								value={address}
								onChange={(e) => setAddress(e.target.value)}
								className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
								placeholder="Exempelgatan 123"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="postalCode"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Postnummer
								</label>
								<input
									id="postalCode"
									name="postalCode"
									type="text"
									required
									value={postalCode}
									onChange={(e) => setPostalCode(e.target.value)}
									className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
									placeholder="123 45"
								/>
							</div>
							<div>
								<label
									htmlFor="city"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Ort
								</label>
								<input
									id="city"
									name="city"
									type="text"
									required
									value={city}
									onChange={(e) => setCity(e.target.value)}
									className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
									placeholder="Stockholm"
								/>
							</div>
						</div>

						{error && (
							<div className="rounded-xl bg-red-50 border border-red-200 p-4">
								<p className="text-sm text-red-800">{error}</p>
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3.5 px-4 rounded-xl text-white font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
						>
							{loading ? 'Slutför registrering...' : 'Slutför och gå till dashboard'}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}

