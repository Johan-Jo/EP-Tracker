import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { OrganizationPageNew } from '@/components/settings/organization-page-new';

export default async function OrganizationSettingsPage() {
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership || membership.role !== 'admin') {
		redirect('/dashboard');
	}

	const supabase = await createClient();
	// ✅ PERFORMANCE: Select specific columns instead of *
	const { data: organization } = await supabase
		.from('organizations')
		.select('id, name, org_number, phone, address, postal_code, city, vat_registered, vat_number, default_vat_rate, default_work_day_start, default_work_day_end, standard_work_hours_per_day, standard_breaks, bankgiro, plusgiro, iban, bic, logo_url, created_at')
		.eq('id', membership.org_id)
		.single();

	if (!organization) {
		redirect('/dashboard');
	}

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
				logo_url: organization.logo_url ?? null,
				created_at: organization.created_at,
			}}
		/>
	);
}

