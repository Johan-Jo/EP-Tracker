import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

export interface BuildParams {
  projectId?: string;
  startDate?: string; // ISO date
  endDate?: string;   // ISO date
}

interface TimeEventLike {
  id: string;
  org_id: string;
  user_id: string;
  project_id: string;
  start_at: string; // check-in
  stop_at: string | null; // check-out
  device?: string | null;
}

export async function buildAttendanceSessions(params: BuildParams = {}) {
  const supabase = await createClient();

  // Fetch candidate time entries as events (M2: use time_entries as source)
  let query = supabase
    .from('time_entries')
    .select('id, org_id, user_id, project_id, start_at, stop_at')
    .order('start_at', { ascending: true })
    .limit(5000);

  if (params.projectId) query = query.eq('project_id', params.projectId);
  if (params.startDate) query = query.gte('start_at', params.startDate);
  if (params.endDate) query = query.lte('start_at', params.endDate);

  const { data: entries, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const events: TimeEventLike[] = (entries || []).map(e => ({
    id: e.id,
    org_id: (e as any).org_id,
    user_id: (e as any).user_id,
    project_id: (e as any).project_id,
    start_at: (e as any).start_at,
    stop_at: (e as any).stop_at,
  }));

  // Group by project+user and pair start->stop
  const byProjectUser = new Map<string, TimeEventLike[]>();
  for (const ev of events) {
    const key = `${ev.project_id}:${ev.user_id}`;
    if (!byProjectUser.has(key)) byProjectUser.set(key, []);
    byProjectUser.get(key)!.push(ev);
  }

  let created = 0;
  let updated = 0;
  let flagged = 0;

  for (const [, list] of byProjectUser) {
    // Sort by start_at ascending
    list.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    for (const ev of list) {
      const checkIn = ev.start_at;
      const checkOut = ev.stop_at; // may be null

      // Skip if no check-in
      if (!checkIn) continue;

      // Generate deterministic hash
      const payload = `${ev.user_id}|${ev.project_id}|${checkIn}|${checkOut ?? ''}|time_entry`;
      const immutableHash = createHash('sha256').update(payload).digest('hex');

      // Upsert session by hash to be idempotent
      const { data: existing } = await supabase
        .from('attendance_session')
        .select('id, immutable_hash')
        .eq('immutable_hash', immutableHash)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Nothing to do; treat as updated if check_out changes later
        updated += 1;
        continue;
      }

      const { error: insertError } = await supabase
        .from('attendance_session')
        .insert({
          org_id: ev.org_id,
          person_id: ev.user_id,
          project_id: ev.project_id,
          check_in_ts: checkIn,
          check_out_ts: checkOut,
          source_first: 'time_entry',
          source_last: 'time_entry',
          immutable_hash: immutableHash,
          corrected: false,
        });

      if (insertError) {
        // Flag and continue
        flagged += 1;
        // eslint-disable-next-line no-console
        console.error('attendance insert error', insertError);
        continue;
      }

      created += 1;
    }
  }

  return { processed: events.length, created, updated, flagged, errors: 0 };
}


