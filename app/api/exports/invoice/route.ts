import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { generateInvoiceCSV, generateInvoiceCSVFilename } from '@/lib/exports/invoice-csv';
import { InvoiceBasisLine } from '@/lib/jobs/invoice-basis-refresh';

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
        const projectId = searchParams.get('projectId');
        const periodStart = searchParams.get('start');
        const periodEnd = searchParams.get('end');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        if (!periodStart || !periodEnd) {
            return NextResponse.json(
                { error: 'start and end parameters are required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // ✅ PERFORMANCE: Select specific columns instead of *
        // Fetch locked invoice_basis record (export requires locked invoice basis)
        const { data: invoiceBasis, error: invoiceBasisError } = await supabase
            .from('invoice_basis')
            .select('id, org_id, project_id, period_start, period_end, locked, lines_json, invoice_number, created_at, updated_at')
            .eq('org_id', membership.org_id)
            .eq('project_id', projectId)
            .eq('period_start', periodStart)
            .eq('period_end', periodEnd)
            .eq('locked', true)
            .single();

        if (invoiceBasisError || !invoiceBasis) {
            return NextResponse.json(
                { error: 'Fakturaunderlaget måste vara låst för export. Lås underlaget först.' },
                { status: 400 }
            );
        }

        // Extract lines and diary from invoice_basis
        const lines = (invoiceBasis.lines_json?.lines || []) as InvoiceBasisLine[];
        const diarySummaries = (invoiceBasis.lines_json?.diary || []) as Array<{
            date: string;
            raw: string;
            summary: string;
            line_ref: string;
        }>;

        // Generate CSV from invoice_basis data
        const csv = generateInvoiceCSV(
            lines,
            diarySummaries,
            invoiceBasis
        );

        const filename = generateInvoiceCSVFilename(
            new Date(periodStart),
            new Date(periodEnd),
            invoiceBasis.invoice_number || undefined
        );

        // Track export batch
        await supabase.from('integration_batches').insert({
            org_id: membership.org_id,
            batch_type: 'invoice_csv',
            period_start: periodStart,
            period_end: periodEnd,
            file_size_bytes: csv.length,
            record_count: lines.length + diarySummaries.length,
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

