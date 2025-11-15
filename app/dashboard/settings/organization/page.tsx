import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizationPageNew } from '@/components/settings/organization-page-new';

export default async function OrganizationSettingsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organization (first one for now)
	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role, organizations(*)')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Only admin can manage organization - redirect others
	if (!membership || membership.role !== 'admin') {
		redirect('/dashboard');
	}

	const organization = membership.organizations as any;

	return (
		<OrganizationPageNew
			organization={{
				id: organization.id,
				name: organization.name,
				org_number: organization.org_number ?? null,
				phone: organization.phone ?? null,
				address: organization.address ?? null,
				postal_code: organization.postal_code ?? null,
				city: organization.city ?? null,
				vat_registered: organization.vat_registered ?? false,
				vat_number: organization.vat_number ?? null,
				default_vat_rate: organization.default_vat_rate ?? null,
				default_work_day_start: organization.default_work_day_start ?? null,
				default_work_day_end: organization.default_work_day_end ?? null,
				standard_work_hours_per_day: organization.standard_work_hours_per_day ?? null,
				standard_breaks: organization.standard_breaks ?? [],
				bankgiro: organization.bankgiro ?? null,
				plusgiro: organization.plusgiro ?? null,
				iban: organization.iban ?? null,
				bic: organization.bic ?? null,
				created_at: organization.created_at,
			}}
		/>
	);
}

