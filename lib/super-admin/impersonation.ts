/**
 * User Impersonation System
 * 
 * Allow super admins to impersonate users for support purposes.
 */

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-logs';

const IMPERSONATION_COOKIE = 'impersonation_session';
const IMPERSONATION_DURATION = 60 * 60 * 1000; // 1 hour

export interface ImpersonationSession {
	user_id: string;
	user_email: string;
	user_name: string;
	org_id: string;
	org_name: string;
	super_admin_id: string;
	started_at: string;
	expires_at: string;
}

/**
 * Start impersonation session
 */
export async function startImpersonation(
	userId: string,
	superAdminId: string
): Promise<ImpersonationSession> {
	const supabase = await createClient();

	// Get user details
	const { data: user } = await supabase
		.from('profiles')
		.select(`
			id,
			email,
			full_name,
			organization_members!inner(
				org_id,
				organizations(
					id,
					name
				)
			)
		`)
		.eq('id', userId)
		.single();

	if (!user) {
		throw new Error('User not found');
	}

	type Org = { id: string; name: string };
	interface OrganizationMemberLite { organizations?: Org | Org[] }
	const orgMember = (user.organization_members?.[0] ?? null) as unknown as OrganizationMemberLite | null;
	const organizations = orgMember?.organizations;
	const org: Org | undefined = Array.isArray(organizations)
		? organizations[0]
		: organizations;

	if (!org) {
		throw new Error('User has no organization');
	}

	const now = new Date();
	const expiresAt = new Date(now.getTime() + IMPERSONATION_DURATION);

	const session: ImpersonationSession = {
		user_id: user.id,
		user_email: user.email,
		user_name: user.full_name || user.email,
		org_id: org.id,
		org_name: org.name,
		super_admin_id: superAdminId,
		started_at: now.toISOString(),
		expires_at: expiresAt.toISOString(),
	};

	// Store in cookie
	const cookieStore = await cookies();
	cookieStore.set(IMPERSONATION_COOKIE, JSON.stringify(session), {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: IMPERSONATION_DURATION / 1000, // seconds
		path: '/',
	});

	// Log audit action
	await logAuditAction(
		superAdminId,
		'impersonate_user',
		'user',
		userId,
		{
			user_email: user.email,
			org_id: org.id,
			org_name: org.name,
		}
	);

	return session;
}

/**
 * End impersonation session
 */
export async function endImpersonation(superAdminId: string): Promise<void> {
	const session = await getImpersonationSession();

	if (session) {
		// Log audit action
		await logAuditAction(
			superAdminId,
			'end_impersonation',
			'user',
			session.user_id,
			{
				user_email: session.user_email,
				duration_seconds: Math.floor(
					(Date.now() - new Date(session.started_at).getTime()) / 1000
				),
			}
		);
	}

	// Clear cookie
	const cookieStore = await cookies();
	cookieStore.delete(IMPERSONATION_COOKIE);
}

/**
 * Get current impersonation session
 */
export async function getImpersonationSession(): Promise<ImpersonationSession | null> {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get(IMPERSONATION_COOKIE);

	if (!sessionCookie) {
		return null;
	}

	try {
		const session: ImpersonationSession = JSON.parse(sessionCookie.value);

		// Check if expired
		if (new Date(session.expires_at) < new Date()) {
			// Session expired, clear it
			cookieStore.delete(IMPERSONATION_COOKIE);
			return null;
		}

		return session;
	} catch (error) {
		console.error('Error parsing impersonation session:', error);
		return null;
	}
}

/**
 * Check if currently impersonating
 */
export async function isImpersonating(): Promise<boolean> {
	const session = await getImpersonationSession();
	return session !== null;
}

