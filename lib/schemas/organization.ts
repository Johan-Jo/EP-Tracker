import { z } from 'zod';

// Organization schema
export const organizationSchema = z.object({
	name: z
		.string()
		.min(1, 'Organisationsnamn krävs')
		.max(200, 'Organisationsnamn är för långt'),
});

export type Organization = {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
};

export type OrganizationFormData = z.infer<typeof organizationSchema>;

// Membership role enum
export const membershipRoleEnum = z.enum(['admin', 'foreman', 'worker', 'finance', 'ue']);

// Membership schema
export const membershipSchema = z.object({
	role: membershipRoleEnum,
	hourly_rate_sek: z
		.number()
		.min(0, 'Faktureringsvärde måste vara positivt')
		.max(999999, 'Faktureringsvärde är för högt')
		.optional()
		.nullable(),
	salary_per_hour_sek: z
		.number()
		.min(0, 'Lön måste vara positiv')
		.max(999999, 'Lön är för hög')
		.optional()
		.nullable(),
	is_active: z.boolean().default(true),
});

export type Membership = {
	id: string;
	org_id: string;
	user_id: string;
	role: string;
	hourly_rate_sek: number | null; // Faktureringsvärde (vad som faktureras kunden)
	salary_per_hour_sek: number | null; // Faktisk lön per timme för anställd
	is_active: boolean;
	created_at: string;
	updated_at: string;
};

export type MembershipFormData = z.infer<typeof membershipSchema>;

// Profile schema (user)
export const profileSchema = z.object({
	full_name: z.string().max(200).optional().nullable(),
	phone: z.string().max(50).optional().nullable(),
});

export type Profile = {
	id: string;
	email: string;
	full_name: string | null;
	phone: string | null;
	created_at: string;
	updated_at: string;
};

export type ProfileFormData = z.infer<typeof profileSchema>;

// Member with profile (for member list view)
export type MemberWithProfile = Membership & {
	profile: Profile;
};

// Invite user schema
export const inviteUserSchema = z.object({
	email: z.string().email('Ogiltig e-postadress'),
	role: membershipRoleEnum,
	hourly_rate_sek: z
		.number()
		.min(0, 'Timtaxa måste vara positiv')
		.max(999999, 'Timtaxa är för hög')
		.optional()
		.nullable(),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;

