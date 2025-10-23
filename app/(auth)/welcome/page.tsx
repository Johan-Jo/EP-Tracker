'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Clock, Briefcase, FileText, Users, Calendar, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type UserRole = 'admin' | 'foreman' | 'worker' | 'finance';

interface RoleContent {
	title: string;
	description: string;
	steps: Array<{
		icon: typeof Briefcase;
		title: string;
		description: string;
	}>;
}

const roleContents: Record<UserRole, RoleContent> = {
	admin: {
		title: 'Välkommen till EP-Tracker! 🎉',
		description: 'Din organisation har skapats och du är nu inloggad som administratör. Dags att sätta igång med ditt första projekt!',
		steps: [
			{
				icon: Briefcase,
				title: 'Skapa ditt första projekt',
				description: 'Lägg till projekt och börja hantera dina entreprenader',
			},
			{
				icon: Users,
				title: 'Bjud in ditt team',
				description: 'Lägg till arbetsledare och arbetare till din organisation',
			},
			{
				icon: FileText,
				title: 'Börja tidrapportera',
				description: 'Registrera tid och material direkt i appen',
			},
		],
	},
	foreman: {
		title: 'Välkommen till teamet! 👋',
		description: 'Du är nu inloggad som arbetsledare. Du kan skapa projekt, tilldela uppdrag och godkänna tidrapporter.',
		steps: [
			{
				icon: Calendar,
				title: 'Utforska planeringsvyn',
				description: 'Schemalägg uppdrag och tilldela personal för veckan',
			},
			{
				icon: FileText,
				title: 'Granska tidrapporter',
				description: 'Godkänn tid, material och utgifter från ditt team',
			},
			{
				icon: Briefcase,
				title: 'Hantera projekt',
				description: 'Skapa nya projekt och följ upp arbetsordern',
			},
		],
	},
	worker: {
		title: 'Välkommen ombord! 👷',
		description: 'Du är nu inloggad som medarbetare. Börja rapportera din arbetstid och material direkt i appen.',
		steps: [
			{
				icon: Clock,
				title: 'Starta tidrapportering',
				description: 'Checka in på dina uppdrag och registrera arbetstid',
			},
			{
				icon: Calendar,
				title: 'Se dina uppdrag',
				description: 'Kontrollera dagens och kommande veckans uppdrag',
			},
			{
				icon: FileText,
				title: 'Rapportera material',
				description: 'Fotografera kvitton och registrera material enkelt',
			},
		],
	},
	finance: {
		title: 'Välkommen till EP-Tracker! 💼',
		description: 'Du är nu inloggad med ekonomiroll. Du har tillgång till godkännanden och exportfunktioner.',
		steps: [
			{
				icon: ClipboardCheck,
				title: 'Granska godkännanden',
				description: 'Se och godkänn tidrapporter, material och utgifter',
			},
			{
				icon: FileText,
				title: 'Exportera till lön',
				description: 'Exportera godkända tidrapporter till ditt lönesystem',
			},
			{
				icon: Briefcase,
				title: 'Följ upp projekt',
				description: 'Se kostnader och status för alla projekt',
			},
		],
	},
};

export default function WelcomePage() {
	const [role, setRole] = useState<UserRole | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		const checkUserRole = async () => {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();

				if (!user) {
					router.push('/sign-in');
					return;
				}

				// Get user's role from membership
				const { data: membership } = await supabase
					.from('memberships')
					.select('role')
					.eq('user_id', user.id)
					.eq('is_active', true)
					.single();

				if (membership) {
					setRole(membership.role as UserRole);
				} else {
					// No membership, redirect to complete setup
					router.push('/complete-setup');
				}
			} catch (error) {
				console.error('Error checking user role:', error);
				router.push('/sign-in');
			} finally {
				setLoading(false);
			}
		};

		checkUserRole();
	}, [router, supabase]);

	if (loading || !role) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
			</div>
		);
	}

	const content = roleContents[role];

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
						{content.title}
					</h1>

					{/* Description */}
					<p className="text-lg text-gray-600 mb-8">
						{content.description}
					</p>

					{/* Next Steps */}
					<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 mb-8 text-left">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Kom igång:
						</h2>
						<div className="space-y-4">
							{content.steps.map((step, index) => {
								const Icon = step.icon;
								return (
									<div key={index} className="flex items-start gap-3">
										<Icon className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
										<div>
											<h3 className="font-medium text-gray-900">{step.title}</h3>
											<p className="text-sm text-gray-600">{step.description}</p>
										</div>
									</div>
								);
							})}
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
