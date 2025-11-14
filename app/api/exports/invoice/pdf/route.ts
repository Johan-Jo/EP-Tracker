import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { generateInvoicePDF, generateInvoicePDFFilename } from '@/lib/exports/invoice-pdf';
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

        // Fetch locked invoice_basis record (export requires locked invoice basis)
        const { data: invoiceBasis, error: invoiceBasisError } = await supabase
            .from('invoice_basis')
            .select('*')
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

        // Fetch organization info (using actual database field names)
        const { data: organization, error: orgError } = await supabase
            .from('organizations')
            .select('name, org_number, address, postal_code, city')
            .eq('id', membership.org_id)
            .single();

        if (orgError || !organization) {
            console.error('Organization fetch error:', orgError);
            return NextResponse.json(
                { error: 'Kunde inte hämta organisationsinformation' },
                { status: 500 }
            );
        }

        // Fetch project name
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json(
                { error: 'Kunde inte hämta projektinformation' },
                { status: 500 }
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

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(
            lines,
            diarySummaries,
            invoiceBasis,
            organization,
            project.name
        );

        const filename = generateInvoicePDFFilename(
            new Date(periodStart),
            new Date(periodEnd),
            invoiceBasis.invoice_number || undefined
        );

        // Track export batch
        await supabase.from('integration_batches').insert({
            org_id: membership.org_id,
            batch_type: 'invoice_pdf',
            period_start: periodStart,
            period_end: periodEnd,
            file_size_bytes: pdfBuffer.length,
            record_count: lines.length + diarySummaries.length,
            created_by: user.id,
        });

        // Return PDF file
        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Invoice PDF export error:', error);
        return NextResponse.json(
            { error: 'Ett oväntat fel uppstod' },
            { status: 500 }
        );
    }
}

