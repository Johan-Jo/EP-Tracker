type TimeEntry = {
    id: string;
    start_at: string;
    duration_min: number | null;
    task_label: string | null;
    user: {
        full_name: string;
        email: string;
    };
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
    user: {
        full_name: string;
    };
    project: {
        name: string;
    };
    created_at: string;
};

type Expense = {
    description: string;
    amount_sek: number;
    category: string | null;
    user: {
        full_name: string;
    };
    project: {
        name: string;
    };
    date: string;
};

type Mileage = {
    distance_km: number;
    rate_per_km: number;
    total_sek: number;
    from_location: string | null;
    to_location: string | null;
    user: {
        full_name: string;
    };
    project: {
        name: string;
    };
    date: string;
};

export function generateSalaryCSV(
    timeEntries: TimeEntry[],
    materials: Material[],
    expenses: Expense[],
    mileage: Mileage[]
): string {
    const rows: string[] = [];
    
    // CSV Header
    rows.push([
        'Datum',
        'Anställd',
        'Email',
        'Projekt',
        'Projektnummer',
        'Fas',
        'Typ',
        'Beskrivning',
        'Timmar',
        'Belopp (SEK)',
        'Kommentar'
    ].join(';'));

    // Add time entries
    for (const entry of timeEntries) {
        const date = new Date(entry.start_at).toLocaleDateString('sv-SE');
        const hours = entry.duration_min ? (entry.duration_min / 60).toFixed(2) : '0.00';
        
        rows.push([
            date,
            entry.user.full_name,
            entry.user.email,
            entry.project.name,
            entry.project.project_number || '',
            entry.phase?.name || '',
            'Tid',
            entry.task_label || '',
            hours,
            '',
            ''
        ].join(';'));
    }

    // Add materials
    for (const material of materials) {
        const date = new Date(material.created_at).toLocaleDateString('sv-SE');
        
        rows.push([
            date,
            material.user.full_name,
            '',
            material.project.name,
            '',
            '',
            'Material',
            `${material.description} (${material.quantity} ${material.unit || 'st'})`,
            '',
            material.total_sek?.toString() || '',
            ''
        ].join(';'));
    }

    // Add expenses
    for (const expense of expenses) {
        const date = new Date(expense.date).toLocaleDateString('sv-SE');
        
        rows.push([
            date,
            expense.user.full_name,
            '',
            expense.project.name,
            '',
            '',
            'Utlägg',
            expense.description,
            '',
            expense.amount_sek.toString(),
            expense.category || ''
        ].join(';'));
    }

    // Add mileage
    for (const entry of mileage) {
        const date = new Date(entry.date).toLocaleDateString('sv-SE');
        const description = entry.from_location && entry.to_location 
            ? `${entry.from_location} → ${entry.to_location} (${entry.distance_km} km)`
            : `${entry.distance_km} km`;
        
        rows.push([
            date,
            entry.user.full_name,
            '',
            entry.project.name,
            '',
            '',
            'Milersättning',
            description,
            '',
            entry.total_sek.toString(),
            `${entry.rate_per_km} kr/km`
        ].join(';'));
    }

    return rows.join('\n');
}

export function generateSalaryCSVFilename(periodStart: Date, periodEnd: Date): string {
    const start = periodStart.toISOString().split('T')[0];
    const end = periodEnd.toISOString().split('T')[0];
    return `lon_${start}_${end}.csv`;
}

