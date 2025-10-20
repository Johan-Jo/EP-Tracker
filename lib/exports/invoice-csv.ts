type TimeEntry = {
    id: string;
    start_at: string;
    duration_min: number | null;
    task_label: string | null;
    project: {
        name: string;
        project_number: string | null;
    };
    phase: {
        name: string;
    } | null;
};

type Material = {
    description: string;
    quantity: number | null;
    unit: string | null;
    unit_price_sek: number | null;
    total_sek: number | null;
    project: {
        name: string;
        project_number: string | null;
    };
    created_at: string;
};

type Expense = {
    description: string;
    amount_sek: number;
    category: string | null;
    project: {
        name: string;
        project_number: string | null;
    };
    date: string;
};

type Ata = {
    ata_number: string | null;
    title: string;
    description: string | null;
    quantity: number;
    unit: string | null;
    unit_price_sek: number;
    total_sek: number;
    project: {
        name: string;
        project_number: string | null;
    };
    created_at: string;
    status: string;
};

export function generateInvoiceCSV(
    timeEntries: TimeEntry[],
    materials: Material[],
    expenses: Expense[],
    atas: Ata[]
): string {
    const rows: string[] = [];
    
    // CSV Header
    rows.push([
        'Datum',
        'Projekt',
        'Projektnummer',
        'Fas/ÄTA-nummer',
        'Typ',
        'Beskrivning',
        'Antal',
        'Enhet',
        'À-pris (SEK)',
        'Totalt (SEK)'
    ].join(';'));

    // Group time entries by project and phase
    const timeByProjectPhase = new Map<string, { entries: TimeEntry[], totalMinutes: number }>();
    
    for (const entry of timeEntries) {
        const key = `${entry.project.name}|${entry.phase?.name || 'Ingen fas'}`;
        const existing = timeByProjectPhase.get(key);
        
        if (existing) {
            existing.entries.push(entry);
            existing.totalMinutes += entry.duration_min || 0;
        } else {
            timeByProjectPhase.set(key, {
                entries: [entry],
                totalMinutes: entry.duration_min || 0
            });
        }
    }

    // Add grouped time entries
    for (const [key, data] of timeByProjectPhase.entries()) {
        const firstEntry = data.entries[0];
        const hours = (data.totalMinutes / 60).toFixed(2);
        const date = new Date(firstEntry.start_at).toLocaleDateString('sv-SE');
        
        rows.push([
            date,
            firstEntry.project.name,
            firstEntry.project.project_number || '',
            firstEntry.phase?.name || 'Ingen fas',
            'Arbete',
            `Arbetad tid (${data.entries.length} registreringar)`,
            hours,
            'timmar',
            '',
            ''
        ].join(';'));
    }

    // Add materials
    for (const material of materials) {
        const date = new Date(material.created_at).toLocaleDateString('sv-SE');
        
        rows.push([
            date,
            material.project.name,
            material.project.project_number || '',
            '',
            'Material',
            material.description,
            material.quantity?.toString() || '',
            material.unit || '',
            material.unit_price_sek?.toString() || '',
            material.total_sek?.toString() || ''
        ].join(';'));
    }

    // Add expenses
    for (const expense of expenses) {
        const date = new Date(expense.date).toLocaleDateString('sv-SE');
        
        rows.push([
            date,
            expense.project.name,
            expense.project.project_number || '',
            '',
            'Utlägg',
            expense.description,
            '1',
            'st',
            expense.amount_sek.toString(),
            expense.amount_sek.toString()
        ].join(';'));
    }

    // Add ÄTA
    for (const ata of atas) {
        // Only include approved ÄTA in invoices
        if (ata.status !== 'approved') continue;
        
        const date = new Date(ata.created_at).toLocaleDateString('sv-SE');
        
        rows.push([
            date,
            ata.project.name,
            ata.project.project_number || '',
            ata.ata_number || 'ÄTA',
            'ÄTA',
            `${ata.title} - ${ata.description || ''}`,
            ata.quantity.toString(),
            ata.unit || 'st',
            ata.unit_price_sek.toString(),
            ata.total_sek.toString()
        ].join(';'));
    }

    return rows.join('\n');
}

export function generateInvoiceCSVFilename(periodStart: Date, periodEnd: Date): string {
    const start = periodStart.toISOString().split('T')[0];
    const end = periodEnd.toISOString().split('T')[0];
    return `faktura_${start}_${end}.csv`;
}

