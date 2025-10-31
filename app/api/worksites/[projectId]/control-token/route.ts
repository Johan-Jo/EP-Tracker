import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const paramsSchema = z.object({ projectId: z.string().uuid() });

function generateToken(length = 32) {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let out = '';
	for (let i = 0; i < length; i++) {
		out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
	}
	return out;
}

export async function POST(_req: NextRequest, { params }: { params: { projectId: string } }) {
	try {
		const parse = paramsSchema.safeParse(params);
		if (!parse.success) {
			return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
		}

		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Must be foreman/admin to rotate control token
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		// Verify project belongs to org
		const { data: project } = await supabase
			.from('projects')
			.select('id, org_id, worksite_enabled')
			.eq('id', params.projectId)
			.eq('org_id', membership.org_id)
			.single();

		if (!project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		if (!project.worksite_enabled) {
			return NextResponse.json({ error: 'Worksite is not enabled' }, { status: 400 });
		}

		const token = generateToken(48);
		const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

		const { error: updateError } = await supabase
			.from('projects')
			.update({ control_qr_token: token, control_qr_expires_at: expires })
			.eq('id', params.projectId)
			.eq('org_id', membership.org_id);

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		return NextResponse.json({ token, expiresAt: expires });
	} catch (e) {
		console.error('POST /api/worksites/[projectId]/control-token error', e);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
