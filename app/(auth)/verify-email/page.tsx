'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function VerifyEmailContent() {
	const searchParams = useSearchParams();
	const email = searchParams.get('email');

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
						Verifiera din e-post
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Vi har skickat ett verifieringsmail till
					</p>
					{email && (
						<p className="mt-1 text-center text-sm font-medium text-gray-900">
							{email}
						</p>
					)}
				</div>

				<div className="mt-8 space-y-6">
					<div className="rounded-md bg-blue-50 p-4">
						<div className="flex">
							<div className="flex-shrink-0">
								<svg
									className="h-5 w-5 text-blue-400"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3 flex-1 md:flex md:justify-between">
								<p className="text-sm text-blue-700">
									Klicka på länken i e-postmeddelandet för att verifiera ditt
									konto och slutföra registreringen.
								</p>
							</div>
						</div>
					</div>

					<div className="rounded-md bg-gray-50 p-4">
						<h3 className="text-sm font-medium text-gray-900 mb-2">
							Hittar du inte mailet?
						</h3>
						<ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
							<li>Kontrollera din skräppost/spam-mapp</li>
							<li>Vänta några minuter - det kan ta lite tid</li>
							<li>Kontrollera att e-postadressen är korrekt stavad</li>
						</ul>
					</div>

					<div className="text-center">
						<Link
							href="/sign-in"
							className="text-sm font-medium text-blue-600 hover:text-blue-500"
						>
							Tillbaka till inloggning
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function VerifyEmailPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center">
					<p>Laddar...</p>
				</div>
			}
		>
			<VerifyEmailContent />
		</Suspense>
	);
}

