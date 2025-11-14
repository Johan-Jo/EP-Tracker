import { createAdminClient } from '@/lib/supabase/server';
import { sendTimeApprovalInvite } from '@/lib/email/send';

function calculateDurationMinutes(startISO: string, stopISO: string | null, fallback?: number | null) {
  if (!stopISO) {
    return fallback ?? 0;
  }
  const start = new Date(startISO).getTime();
  const stop = new Date(stopISO).getTime();
  if (Number.isNaN(start) || Number.isNaN(stop) || stop <= start) {
    return Math.max(0, fallback ?? 0);
  }
  return Math.round((stop - start) / 60000);
}

/**
 * Sends approval invite emails to admins for a completed time entry.
 */
export async function sendTimeApprovalInviteForEntry(entryId: string) {
  try {
    const supabase = createAdminClient();

    const { data: entry, error } = await supabase
      .from('time_entries')
      .select(`
          id,
          org_id,
          user_id,
          project_id,
          start_at,
          stop_at,
          duration_min,
          notes,
          status,
          user:profiles!time_entries_user_id_fkey(full_name, email),
          project:projects(name)
        `)
      .eq('id', entryId)
      .single();

    if (error || !entry) {
      console.error('Failed to fetch time entry for approval invite:', error);
      return;
    }

    // Only send for completed entries
    if (!entry.stop_at) {
      return;
    }

    const minutes = calculateDurationMinutes(entry.start_at, entry.stop_at, entry.duration_min);
    if (minutes <= 0) {
      return;
    }

    const entryDate = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'long' }).format(new Date(entry.start_at));
    const entryHours = (minutes / 60).toLocaleString('sv-SE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    const { count: pendingCount } = await supabase
      .from('time_entries')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', entry.org_id)
      .eq('user_id', entry.user_id)
      .in('status', ['draft', 'submitted'])
      .not('stop_at', 'is', null);

    const { data: admins, error: adminError } = await supabase
      .from('memberships')
      .select('user_id, profile:profiles!memberships_user_id_fkey(full_name, email)')
      .eq('org_id', entry.org_id)
      .eq('is_active', true)
      .eq('role', 'admin');

    if (adminError) {
      console.error('Failed to fetch admin recipients for approval invite:', adminError);
      return;
    }

    const recipients =
      admins
        ?.map((membership) => ({
          userId: membership.user_id,
          name: membership.profile?.full_name ?? null,
          email: membership.profile?.email ?? null,
        }))
        .filter((recipient) => Boolean(recipient.email) && recipient.userId !== entry.user_id) ?? [];

    if (recipients.length === 0) {
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const reviewUrl = `${baseUrl}/dashboard/approvals/quick-approve?mode=single&entryId=${encodeURIComponent(entry.id)}`;
    const approveUrl = `${reviewUrl}&action=approve`;

    const includeBulkLink = (pendingCount ?? 0) > 1;
    const approveAllUrl = includeBulkLink
      ? `${baseUrl}/dashboard/approvals/quick-approve?mode=all&userId=${encodeURIComponent(entry.user_id)}`
      : undefined;

    const workerName = entry.user?.full_name ?? 'Okänd användare';
    const workerSubjectName = workerName.trim().endsWith('s')
      ? `${workerName}’`
      : `${workerName}s`;
    const projectName = entry.project?.name ?? null;
    const trimmedNotes = entry.notes?.trim() ? entry.notes.trim() : null;
    const checkInTime = entry.start_at
      ? new Date(entry.start_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
      : null;
    const checkOutTime = entry.stop_at
      ? new Date(entry.stop_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
      : null;

    await Promise.all(
      recipients.map((recipient) =>
        sendTimeApprovalInvite({
          to: recipient.email!,
          toName: recipient.name,
          organizationId: entry.org_id,
          workerName,
          projectName,
          entryDate,
          entryHours: `${entryHours} h`,
          notes: trimmedNotes,
          approveUrl,
          approveAllUrl,
          pendingCount: pendingCount ?? 1,
          checkInTime,
          checkOutTime,
          subject: `${workerSubjectName} tidrapport behöver ditt godkännande`,
          reviewUrl,
        })
      )
    );
  } catch (error) {
    console.error('Unexpected error while sending time approval invite:', error);
  }
}


