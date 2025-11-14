import type { SupabaseClient } from '@supabase/supabase-js';
import { sendApprovalConfirmed } from '@/lib/notifications';

interface ApproveTimeEntriesOptions {
  supabase: SupabaseClient<any, 'public', any>;
  entryIds: string[];
  approverId: string;
  orgId: string;
}

function getWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function approveTimeEntries(options: ApproveTimeEntriesOptions) {
  const { supabase, entryIds, approverId, orgId } = options;

  if (!entryIds.length) {
    return { entries: [] };
  }

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .in('id', entryIds)
    .eq('org_id', orgId)
    .select('*');

  if (error) {
    throw error;
  }

  const entries = data ?? [];

  if (entries.length === 0) {
    return { entries: [] };
  }

  const userGroups = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    if (!acc[entry.user_id]) {
      acc[entry.user_id] = [];
    }
    acc[entry.user_id].push(entry);
    return acc;
  }, {});

  const { data: approverProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', approverId)
    .single();

  const approverName = approverProfile?.full_name || 'Administrator';

  await Promise.all(
    Object.entries(userGroups).map(async ([userId, userEntries]) => {
      const totalHours = userEntries.reduce((sum, entry) => {
        if (entry.start_at && entry.stop_at) {
          const start = new Date(entry.start_at).getTime();
          const stop = new Date(entry.stop_at).getTime();
          if (!Number.isNaN(start) && !Number.isNaN(stop) && stop > start) {
            return sum + (stop - start) / (1000 * 60 * 60);
          }
        }
        return sum;
      }, 0);

      const firstEntry = userEntries[0];
      const entryDate = new Date(firstEntry.start_at);
      const weekNumber = getWeekNumber(entryDate);
      const year = entryDate.getFullYear();

      await sendApprovalConfirmed({
        userId,
        weekNumber,
        year,
        approverName,
        totalHours: Math.round(totalHours * 10) / 10,
      });
    })
  );

  return { entries };
}


