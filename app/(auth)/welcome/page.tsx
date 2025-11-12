import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Check, Briefcase, FileText, Users, Calendar, ClipboardCheck, Clock } from 'lucide-react';

type UserRole = 'admin' | 'foreman' | 'worker' | 'finance' | 'ue';

interface RoleContent {
	title: string;
	description: string;
	steps: Array<{
		iconName: string;
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
				iconName: 'Briefcase',
				title: 'Skapa ditt första projekt',
				description: 'Lägg till projekt och börja hantera dina entreprenader',
			},
			{
				iconName: 'Users',
				title: 'Bjud in ditt team',
				description: 'Lägg till arbetsledare och arbetare till din organisation',
			},
			{
				iconName: 'FileText',
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
				iconName: 'Calendar',
				title: 'Utforska planeringsvyn',
				description: 'Schemalägg uppdrag och tilldela personal för veckan',
			},
			{
				iconName: 'FileText',
				title: 'Granska tidrapporter',
				description: 'Godkänn tid, material och utgifter från ditt team',
			},
			{
				iconName: 'Briefcase',
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
				iconName: 'Clock',
				title: 'Starta tidrapportering',
				description: 'Checka in på dina uppdrag och registrera arbetstid',
			},
			{
				iconName: 'Calendar',
				title: 'Se dina uppdrag',
				description: 'Kontrollera dagens och kommande veckans uppdrag',
			},
			{
				iconName: 'FileText',
				title: 'Rapportera material',
				description: 'Fotografera kvitton och registrera material enkelt',
			},
		],
	},
	ue: {
		title: 'Välkommen som UE! 🤝',
		description: 'Du är nu inloggad som underentreprenör. Rapportera din arbetstid, material och kostnader precis som dina egna anställda.',
		steps: [
			{
				iconName: 'Clock',
				title: 'Registrera arbetstid',
				description: 'Starta timers och rapportera dina timmar på tilldelade uppdrag',
			},
			{
				iconName: 'Calendar',
				title: 'Håll koll på uppdrag',
				description: 'Se dagens jobb och kommande arbetspass i planeringslistan',
			},
			{
				iconName: 'FileText',
				title: 'Rapportera material & kostnader',
				description: 'Dokumentera material, resor och utlägg direkt på projektet',
			},
		],
	},
	finance: {
		title: 'Välkommen till EP-Tracker! 💼',
		description: 'Du är nu inloggad med ekonomiroll. Du har tillgång till godkännanden och exportfunktioner.',
		steps: [
			{
				iconName: 'ClipboardCheck',
				title: 'Granska godkännanden',
				description: 'Se och godkänn tidrapporter, material och utgifter',
			},
			{
				iconName: 'FileText',
				title: 'Exportera till lön',
				description: 'Exportera godkända tidrapporter till ditt lönesystem',
			},
			{
				iconName: 'Briefcase',
				title: 'Följ upp projekt',
				description: 'Se kostnader och status för alla projekt',
			},
		],
	},
};

const iconMap = {
	Briefcase,
	FileText,
	Users,
	Calendar,
	ClipboardCheck,
	Clock,
};

export default async function WelcomePage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's role from membership
	const { data: membership } = await supabase
		.from('memberships')
		.select('role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	if (!membership) {
		// No membership, redirect to complete setup
		redirect('/complete-setup');
	}

	const role = membership.role as UserRole;
	
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
								const Icon = iconMap[step.iconName as keyof typeof iconMap];
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
						href="/dashboard?tour=dashboard"
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
