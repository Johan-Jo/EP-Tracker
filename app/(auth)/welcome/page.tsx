import Link from 'next/link';
import { Check, Clock, Briefcase, FileText } from 'lucide-react';

export default function WelcomePage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
			<div className="max-w-2xl w-full">
				<div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
					{/* Success Icon */}
					<div className="mb-6 flex justify-center">
						<div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
							<Check className="h-12 w-12 text-green-600" />
						</div>
					</div>

					{/* Title */}
					<h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						Välkommen till EP-Tracker! 🎉
					</h1>

					{/* Description */}
					<p className="text-lg text-gray-600 mb-8">
						Din organisation har skapats och du är nu inloggad som administratör.
						Dags att sätta igång med ditt första projekt!
					</p>

					{/* Next Steps */}
					<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 mb-8 text-left">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Nästa steg:
						</h2>
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<Briefcase className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
								<div>
									<h3 className="font-medium text-gray-900">Skapa ditt första projekt</h3>
									<p className="text-sm text-gray-600">Lägg till projekt och börja hantera dina entreprenader</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Clock className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
								<div>
									<h3 className="font-medium text-gray-900">Bjud in ditt team</h3>
									<p className="text-sm text-gray-600">Lägg till arbetsledare och arbetare till din organisation</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<FileText className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
								<div>
									<h3 className="font-medium text-gray-900">Börja tidrapportera</h3>
									<p className="text-sm text-gray-600">Registrera tid och material direkt i appen</p>
								</div>
							</div>
						</div>
					</div>

					{/* CTA Button */}
					<Link
						href="/dashboard"
						className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
					>
						Gå till Dashboard
					</Link>

					{/* Help Link */}
					<p className="mt-6 text-sm text-gray-500">
						Behöver du hjälp att komma igång?{' '}
						<Link href="/dashboard/help" className="text-orange-600 hover:text-orange-700 font-medium">
							Läs guiden
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

