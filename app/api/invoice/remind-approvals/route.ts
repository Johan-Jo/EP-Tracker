import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { sendEmail } from '@/lib/email/send';
import { render } from '@react-email/render';

/**
 * POST /api/invoice/remind-approvals
 * 
 * Sends reminder email to all admins in the organization about pending approvals.
 * Finance users can trigger this.
 * 
 * Input: { projectIds: string[], from: string, to: string, summary: {...} }
 */
export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		// Both admin and finance can send reminders
		if (membership.role !== 'admin' && membership.role !== 'finance') {
			return NextResponse.json(
				{ error: 'Endast administratörer och ekonomi kan skicka påminnelser' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { projectIds, from, to, summary } = body;

		if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
			return NextResponse.json(
				{ error: 'projectIds krävs' },
				{ status: 400 }
			);
		}

		if (!from || !to) {
			return NextResponse.json(
				{ error: 'from och to datum krävs' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Get all admin users in the organization
		const { data: adminMemberships, error: adminError } = await supabase
			.from('memberships')
			.select(`
				user_id,
				profile:profiles!memberships_user_id_fkey(id, email, full_name)
			`)
			.eq('org_id', membership.org_id)
			.eq('role', 'admin')
			.eq('is_active', true);

		if (adminError) {
			console.error('[invoice/remind-approvals] Error fetching admins:', adminError);
			return NextResponse.json(
				{ error: 'Kunde inte hämta administratörer' },
				{ status: 500 }
			);
		}

		if (!adminMemberships || adminMemberships.length === 0) {
			return NextResponse.json(
				{ error: 'Inga administratörer hittades i organisationen' },
				{ status: 400 }
			);
		}

		// Get project names for the email
		const { data: projects } = await supabase
			.from('projects')
			.select('id, name, project_number')
			.in('id', projectIds)
			.eq('org_id', membership.org_id);

		const projectNames = (projects || [])
			.map((p) => (p.project_number ? `${p.project_number} – ${p.name}` : p.name))
			.join(', ');

		// Build deep link to Fakturaunderlag page
		const deepLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/invoice-basis?projects=${projectIds.join(',')}&from=${from}&to=${to}&focus=pending`;

		// Build summary text
		const summaryText = Object.entries(summary || {}).map(([type, data]: [string, any]) => {
			const typeNames: Record<string, string> = {
				time: 'Tid',
				material: 'Material',
				expense: 'Utlägg',
				mileage: 'Mil/Resor',
				ata: 'ÄTA',
			};
			return `${typeNames[type] || type}: ${data.count || 0} poster, Totalt ex moms: ${(data.total || 0).toLocaleString('sv-SE')} kr`;
		}).join('\n');

		// Get sender name
		const { data: senderProfile } = await supabase
			.from('profiles')
			.select('full_name, email')
			.eq('id', user.id)
			.single();

		const senderName = senderProfile?.full_name || senderProfile?.email || 'En användare';

		// Send email to each admin
		const emailPromises = adminMemberships
			.filter((m) => m.profile && typeof m.profile === 'object' && (m.profile as any).email)
			.map((m) => {
				const profile = m.profile as { id: string; email: string; full_name?: string | null };
				return sendEmail({
					to: profile.email,
					toName: profile.full_name || undefined,
					subject: `EP-Tracker – Ogodkänt underlag för fakturering [${projectNames} / ${from} - ${to}]`,
					template: 'custom',
					templateData: {
						html: `
							<!DOCTYPE html>
							<html>
							<head>
								<meta charset="utf-8">
								<style>
									body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
									.container { max-width: 600px; margin: 0 auto; padding: 20px; }
									.header { background-color: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
									.content { background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none; }
									.summary { background-color: #f5f5f4; padding: 15px; border-radius: 4px; margin: 15px 0; }
									.button { display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 15px 0; }
									.footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
								</style>
							</head>
							<body>
								<div class="container">
									<div class="header">
										<h1>EP-Tracker – Påminnelse om godkännande</h1>
									</div>
									<div class="content">
										<p>Hej ${profile.full_name || ''},</p>
										<p>${senderName} har begärt att du godkänner poster för fakturaunderlag.</p>
										<p><strong>Projekt:</strong> ${projectNames}</p>
										<p><strong>Period:</strong> ${from} till ${to}</p>
										<div class="summary">
											<h3>Sammanfattning:</h3>
											<pre style="white-space: pre-wrap; font-family: inherit;">${summaryText}</pre>
										</div>
										<p>Vänligen logga in i EP-Tracker för att granska och godkänna posterna.</p>
										<a href="${deepLink}" class="button">Öppna fakturaunderlag</a>
									</div>
									<div class="footer">
										<p>Detta är ett automatiskt meddelande från EP-Tracker. Svara inte på detta e-postmeddelande.</p>
									</div>
								</div>
							</body>
							</html>
						`,
					},
					organizationId: membership.org_id,
					sentBy: user.id,
				});
			});

		await Promise.all(emailPromises);

		return NextResponse.json({
			success: true,
			adminsNotified: adminMemberships.length,
		});
	} catch (error) {
		console.error('Remind approvals error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

