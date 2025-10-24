'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function VerifyEmailContent() {
	const searchParams = useSearchParams();
	const email = searchParams.get('email');
	const [resending, setResending] = useState(false);
	const [resent, setResent] = useState(false);

	const handleResend = async () => {
		setResending(true);
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));
		setResending(false);
		setResent(true);
		setTimeout(() => setResent(false), 3000);
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-lg w-full">
				{/* Card Container */}
				<div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
					{/* Header with Icon */}
					<div className="bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-12 text-center">
						<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6 animate-bounce">
							<Mail className="w-10 h-10 text-white" strokeWidth={2} />
						</div>
						<h1 className="text-3xl font-bold text-white mb-3">
							Kolla din e-post! 📧
						</h1>
						<p className="text-orange-100 text-lg">
							Vi har skickat ett verifieringsmail
						</p>
					</div>

					{/* Content */}
					<div className="px-8 py-8 space-y-6">
						{/* Email Display */}
						{email && (
							<div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
								<p className="text-sm text-gray-600 text-center mb-1">E-postadressen:</p>
								<p className="text-center text-lg font-semibold text-gray-900 break-all">
									{email}
								</p>
							</div>
						)}

						{/* Success Message Box */}
						<div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
							<div className="flex items-start gap-4">
								<div className="flex-shrink-0">
									<CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
								</div>
								<div>
									<h3 className="font-semibold text-green-900 mb-2">
										Nästa steg
									</h3>
									<p className="text-sm text-green-800 leading-relaxed">
										Klicka på länken i e-postmeddelandet för att verifiera ditt konto och slutföra registreringen.
									</p>
								</div>
							</div>
						</div>

						{/* Troubleshooting Tips */}
						<div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
							<div className="flex items-start gap-4">
								<div className="flex-shrink-0">
									<AlertCircle className="w-6 h-6 text-blue-600 mt-0.5" />
								</div>
								<div className="flex-1">
									<h3 className="font-semibold text-blue-900 mb-3">
										Hittar du inte mailet?
									</h3>
									<ul className="space-y-2 text-sm text-blue-800">
										<li className="flex items-start gap-2">
											<span className="text-blue-500 mt-1">•</span>
											<span>Kontrollera din skräppost/spam-mapp</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-blue-500 mt-1">•</span>
											<span>Vänta några minuter - det kan ta lite tid</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-blue-500 mt-1">•</span>
											<span>Kontrollera att e-postadressen är korrekt stavad</span>
										</li>
									</ul>
								</div>
							</div>
						</div>

						{/* Resend Button */}
						<div className="pt-2">
							<Button
								onClick={handleResend}
								disabled={resending || resent}
								variant="outline"
								className="w-full h-12 text-base font-medium border-2 hover:bg-gray-50 transition-all"
							>
								{resending ? (
									<>
										<RefreshCw className="w-5 h-5 mr-2 animate-spin" />
										Skickar...
									</>
								) : resent ? (
									<>
										<CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
										E-post skickad!
									</>
								) : (
									<>
										<RefreshCw className="w-5 h-5 mr-2" />
										Skicka nytt verifieringsmail
									</>
								)}
							</Button>
						</div>

						{/* Back to Login */}
						<div className="pt-4 border-t border-gray-200">
							<Link
								href="/sign-in"
								className="flex items-center justify-center gap-2 text-base font-medium text-gray-700 hover:text-orange-600 transition-colors group"
							>
								<ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
								Tillbaka till inloggning
							</Link>
						</div>
					</div>
				</div>

				{/* Footer Note */}
				<p className="mt-8 text-center text-sm text-gray-600">
					Behöver du hjälp?{' '}
					<a href="mailto:support@eptracker.se" className="text-orange-600 hover:text-orange-700 font-medium">
						Kontakta support
					</a>
				</p>
			</div>
		</div>
	);
}

export default function VerifyEmailPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50">
					<div className="text-center">
						<RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
						<p className="text-gray-600">Laddar...</p>
					</div>
				</div>
			}
		>
			<VerifyEmailContent />
		</Suspense>
	);
}

