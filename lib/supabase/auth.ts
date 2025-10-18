import { createClient } from './server';
import { redirect } from 'next/navigation';

export async function getSession() {
	const supabase = await createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();
	return session;
}

export async function getUser() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	return user;
}

export async function requireAuth() {
	const session = await getSession();
	if (!session) {
		redirect('/sign-in');
	}
	return session;
}

export async function requireRole(allowedRoles: string[]) {
	const session = await requireAuth();
	const supabase = await createClient();

	// Get user's role from memberships table
	const { data: membership } = await supabase
		.from('memberships')
		.select('role, org_id')
		.eq('user_id', session.user.id)
		.single();

	if (!membership || !allowedRoles.includes(membership.role)) {
		redirect('/unauthorized');
	}

	return { session, membership };
}

