import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { generateInvoiceCSV, generateInvoiceCSVFilename } from '@/lib/exports/invoice-csv';

export async function GET(request: NextRequest) {
    try {
        const { user, membership } = await getSession();

        if (!user || !membership) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admin and foreman can export
        if (membership.role !== 'admin' && membership.role !== 'foreman') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const periodStart = searchParams.get('start');
        const periodEnd = searchParams.get('end');

        if (!periodStart || !periodEnd) {
            return NextResponse.json(
                { error: 'start and end parameters are required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Fetch approved time entries
        const { data: timeEntries } = await supabase
            .from('time_entries')
            .select(`
                *,
                project:projects(name, project_number),
                phase:phases(name)
            `)
            .eq('org_id', membership.org_id)
            .eq('status', 'approved')
            .gte('start_at', periodStart)
            .lte('start_at', periodEnd);

        // Fetch approved materials
        const { data: materials } = await supabase
            .from('materials')
            .select(`
                *,
                project:projects(name, project_number)
            `)
            .eq('org_id', membership.org_id)
            .eq('status', 'approved')
            .gte('created_at', periodStart)
            .lte('created_at', periodEnd);

        // Fetch approved expenses
        const { data: expenses } = await supabase
            .from('expenses')
            .select(`
                *,
                project:projects(name, project_number)
            `)
            .eq('org_id', membership.org_id)
            .eq('status', 'approved')
            .gte('date', periodStart)
            .lte('date', periodEnd);

        // Fetch approved ÄTA
        const { data: atas } = await supabase
            .from('ata')
            .select(`
                *,
                project:projects(name, project_number)
            `)
            .eq('org_id', membership.org_id)
            .eq('status', 'approved')
            .gte('created_at', periodStart)
            .lte('created_at', periodEnd);

        // Generate CSV
        const csv = generateInvoiceCSV(
            timeEntries || [],
            materials || [],
            expenses || [],
            atas || []
        );

        const filename = generateInvoiceCSVFilename(
            new Date(periodStart),
            new Date(periodEnd)
        );

        // Track export batch
        await supabase.from('integration_batches').insert({
            org_id: membership.org_id,
            batch_type: 'invoice_csv',
            period_start: periodStart,
            period_end: periodEnd,
            file_size_bytes: csv.length,
            record_count: (timeEntries?.length || 0) + (materials?.length || 0) + (expenses?.length || 0) + (atas?.length || 0),
            created_by: user.id,
        });

        // Return CSV file
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Invoice export error:', error);
        return NextResponse.json(
            { error: 'Ett oväntat fel uppstod' },
            { status: 500 }
        );
    }
}

