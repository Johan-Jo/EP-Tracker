'use client';

import { useQuery } from '@tanstack/react-query';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, Download } from 'lucide-react';

type ExportBatch = {
    id: string;
    batch_type: string;
    period_start: string;
    period_end: string;
    record_count: number;
    created_at: string;
    created_by_profile: {
        full_name: string;
    };
};

type ExportsHistoryProps = {
    orgId: string;
};

export function ExportsHistory({ orgId }: ExportsHistoryProps) {
    const { data, isLoading } = useQuery({
        queryKey: ['exports-history', orgId],
        queryFn: async () => {
            const response = await fetch('/api/exports/history');
            if (!response.ok) throw new Error('Failed to fetch export history');
            return response.json();
        },
    });

    const batches: ExportBatch[] = data?.batches || [];

    const getBatchTypeLabel = (type: string) => {
        switch (type) {
            case 'salary_csv':
                return 'Löne-CSV';
            case 'invoice_csv':
                return 'Faktura-CSV';
            case 'attachments_zip':
                return 'Bilagor (ZIP)';
            default:
                return type;
        }
    };

    const getBatchTypeBadge = (type: string) => {
        switch (type) {
            case 'salary_csv':
                return <Badge variant="outline" className="bg-blue-50">Lön</Badge>;
            case 'invoice_csv':
                return <Badge variant="outline" className="bg-green-50">Faktura</Badge>;
            case 'attachments_zip':
                return <Badge variant="outline" className="bg-purple-50">Bilagor</Badge>;
            default:
                return <Badge>{type}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Typ</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Antal poster</TableHead>
                            <TableHead>Skapad av</TableHead>
                            <TableHead>Datum</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Ingen exporthistorik än</p>
                                    <p className="text-sm mt-2">Generera en export för att se historik här</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            batches.map((batch) => (
                                <TableRow key={batch.id}>
                                    <TableCell>
                                        {getBatchTypeBadge(batch.batch_type)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {new Date(batch.period_start).toLocaleDateString('sv-SE')}
                                            {' - '}
                                            {new Date(batch.period_end).toLocaleDateString('sv-SE')}
                                        </div>
                                    </TableCell>
                                    <TableCell>{batch.record_count}</TableCell>
                                    <TableCell>{batch.created_by_profile.full_name}</TableCell>
                                    <TableCell>
                                        {new Date(batch.created_at).toLocaleString('sv-SE')}
                                    </TableCell>
                                    <TableCell>
                                        <Download className="w-4 h-4 text-muted-foreground opacity-50" />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

