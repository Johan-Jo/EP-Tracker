'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Clock, FileText, DollarSign, Smartphone, Users, ArrowLeft } from 'lucide-react';

type Step = 1 | 2;

interface Step1Data {
	email: string;
	password: string;
	fullName: string;
}

interface Step2Data {
	companyName: string;
	orgNumber: string;
	phone: string;
	address: string;
	postalCode: string;
	city: string;
}

export default function SignUpPage() {
	const [step, setStep] = useState<Step>(1);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [fullName, setFullName] = useState('');
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

	// Load saved progress from localStorage
	useEffect(() => {
		const savedStep1 = localStorage.getItem('signup_step1');
		const savedStep2 = localStorage.getItem('signup_step2');
		const savedUserId = localStorage.getItem('signup_userId');
		
		if (savedStep1) {
			const data = JSON.parse(savedStep1) as Step1Data;
			setEmail(data.email);
			setFullName(data.fullName);
			// Don't restore password for security
		}
		
		if (savedStep2) {
			const data = JSON.parse(savedStep2) as Step2Data;
			setCompanyName(data.companyName);
			setOrgNumber(data.orgNumber);
			setPhone(data.phone);
			setAddress(data.address);
			setPostalCode(data.postalCode);
			setCity(data.city);
		}
		
		if (savedUserId) {
			setUserId(savedUserId);
			setStep(2); // Resume at step 2 if user ID exists
		}
	}, []);

	const handleStep1Submit = (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (password.length < 8) {
			setError('Lösenordet måste vara minst 8 tecken');
			return;
		}

		// Just save to localStorage and move to step 2
		localStorage.setItem('signup_step1', JSON.stringify({ email, password: '', fullName }));
		setStep(2);
	};

	const handleStep2Submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		// Save step 2 data to localStorage
		localStorage.setItem('signup_step2', JSON.stringify({
			companyName,
			orgNumber,
			phone,
			address,
			postalCode,
			city,
		}));

		try {
			// Send ALL data in one call - creates user, org, and membership
			const res = await fetch('/api/auth/complete-signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					// Step 1 data
					email,
					password,
					fullName,
					// Step 2 data
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

			// Redirect to verify email page
			router.push('/verify-email?email=' + encodeURIComponent(email));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ett fel uppstod vid registrering');
		} finally {
			setLoading(false);
		}
	};

	const features = [
		{
			icon: Clock,
			title: 'Enkel tidrapportering',
			description: 'Registrera arbetstid direkt från mobilen. Gör det enkelt för alla i teamet.',
		},
		{
			icon: FileText,
			title: 'Digital dokumentation',
			description: 'Dagbok, ÄTA och checklistor på ett ställe. Allt samlat och alltid tillgängligt.',
		},
		{
			icon: DollarSign,
			title: 'Snabbare fakturering',
			description: 'Generera fakturaunderlag med ett klick. Spara tid och minska administrationen.',
		},
		{
			icon: Smartphone,
			title: 'Funkar offline',
			description: 'Synkar automatiskt när du får uppkoppling. Jobba ostört oavsett täckning.',
		},
		{
			icon: Users,
			title: 'För hela teamet',
			description: 'Bjud in arbetare, arbetsledare och admins. Alla får rätt åtkomst.',
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 relative overflow-hidden">
			{/* Decorative circles */}
			<div className="absolute right-0 top-0 -mr-40 -mt-40 h-80 w-80 rounded-full bg-orange-200 opacity-20 blur-3xl" />
			<div className="absolute bottom-0 left-0 -mb-40 -ml-40 h-80 w-80 rounded-full bg-blue-200 opacity-20 blur-3xl" />

			<div className="relative flex min-h-screen">
				{/* Left side - Benefits & Features */}
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
							Börja spara tid redan idag
						</h1>
						<p className="text-xl text-gray-600 mb-12">
							Gå med i företag som redan digitaliserat sin tidrapportering och projekthantering.
						</p>

						<div className="space-y-6">
							{features.map((feature, index) => (
								<div key={index} className="flex items-start gap-4">
									<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 flex-shrink-0">
										<feature.icon className="h-6 w-6 text-orange-600" />
									</div>
									<div>
										<h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
										<p className="text-gray-600 text-sm">{feature.description}</p>
									</div>
								</div>
							))}
						</div>

						<div className="mt-12 pt-8 border-t border-gray-200">
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<Check className="h-5 w-5 text-green-600" />
								<span>14 dagars gratis testperiod</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
								<Check className="h-5 w-5 text-green-600" />
								<span>Ingen bindningstid</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
								<Check className="h-5 w-5 text-green-600" />
								<span>Inga kortuppgifter behövs</span>
							</div>
						</div>
					</div>
				</div>

				{/* Right side - Sign up form */}
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
							{/* Progress indicator */}
							<div className="mb-8">
								<div className="flex items-center justify-center gap-2 mb-6">
									<div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'} font-semibold text-sm`}>
										1
									</div>
									<div className={`h-1 w-16 ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
									<div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'} font-semibold text-sm`}>
										2
									</div>
								</div>

								<h2 className="text-3xl font-bold text-gray-900">
									{step === 1 ? 'Skapa ditt konto' : 'Företagsinformation'}
								</h2>
								<p className="mt-2 text-gray-600">
									{step === 1 ? 'Kom igång på mindre än 2 minuter' : 'Berätta lite om ditt företag'}
								</p>
							</div>

							{/* Step 1: User account */}
							{step === 1 && (
								<form onSubmit={handleStep1Submit} className="space-y-5">
									<div>
										<label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
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
											className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
											placeholder="Ange ditt namn"
										/>
									</div>

									<div>
										<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
											E-postadress
										</label>
										<input
											id="email"
											name="email"
											type="text"
											autoComplete="email"
											required
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
											placeholder="din@email.se"
											pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
											title="Ange en giltig e-postadress"
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
											autoComplete="new-password"
											required
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
											placeholder="Minst 8 tecken"
										/>
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
										{loading ? 'Skapar konto...' : 'Fortsätt till företagsinfo'}
									</button>

									<p className="text-xs text-center text-gray-500 mt-4">
										Genom att skapa ett konto godkänner du våra användarvillkor och integritetspolicy
									</p>
								</form>
							)}

							{/* Step 2: Company info */}
							{step === 2 && (
								<form onSubmit={handleStep2Submit} className="space-y-5">
									<div>
										<label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
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
										<label htmlFor="orgNumber" className="block text-sm font-medium text-gray-700 mb-2">
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
										<label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
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
										<label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
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
											<label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
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
											<label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
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

									<div className="flex gap-3">
										<button
											type="button"
											onClick={() => setStep(1)}
											className="flex-shrink-0 py-3.5 px-4 rounded-xl text-gray-700 font-medium bg-white border-2 border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 flex items-center gap-2"
										>
											<ArrowLeft className="h-4 w-4" />
											Tillbaka
										</button>
										<button
											type="submit"
											disabled={loading}
											className="flex-1 py-3.5 px-4 rounded-xl text-white font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
										>
											{loading ? 'Slutför registrering...' : 'Slutför registrering'}
										</button>
									</div>
								</form>
							)}
						</div>

						<p className="mt-6 text-center text-sm text-gray-600">
							Har du redan ett konto?{' '}
							<Link
								href="/sign-in"
								className="font-semibold text-orange-600 hover:text-orange-700 transition-colors"
							>
								Logga in här
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

