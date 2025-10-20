import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function GET() {
    try {
        const { user, membership } = await getSession();

        if (!user || !membership) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admin and foreman can view export history
        if (membership.role !== 'admin' && membership.role !== 'foreman') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('integration_batches')
            .select(`
                *,
                created_by_profile:profiles!integration_batches_created_by_fkey(full_name)
            `)
            .eq('org_id', membership.org_id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ batches: data });
    } catch (error) {
        console.error('History fetch error:', error);
        return NextResponse.json(
            { error: 'Ett oväntat fel uppstod' },
            { status: 500 }
        );
    }
}

