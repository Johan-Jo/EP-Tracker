'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Check, X, MessageSquare, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { RequestChangesDialog } from './request-changes-dialog';

type TimeEntry = {
    id: string;
    user_id: string;
    project_id: string;
    task_label: string | null;
    start_at: string;
    stop_at: string | null;
    duration_min: number | null;
    notes: string | null;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    user: {
        full_name: string;
    };
    project: {
        name: string;
        project_number: string | null;
    };
    phase: {
        name: string;
    } | null;
};

type TimeEntriesReviewTableProps = {
    orgId: string;
    periodStart: Date;
    periodEnd: Date;
};

export function TimeEntriesReviewTable({ 
    orgId, 
    periodStart, 
    periodEnd 
}: TimeEntriesReviewTableProps) {
    const queryClient = useQueryClient();
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<string>('submitted');
    const [userFilter, setUserFilter] = useState<string>('');
    const [projectFilter, setProjectFilter] = useState<string>('');
    const [requestChangesEntry, setRequestChangesEntry] = useState<TimeEntry | null>(null);

    // Fetch time entries
    const { data, isLoading, error } = useQuery({
        queryKey: ['time-entries-review', orgId, periodStart.toISOString(), periodEnd.toISOString(), statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
            });
            if (statusFilter) {
                params.append('status', statusFilter);
            }
            const response = await fetch(`/api/approvals/time-entries?${params}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch time entries');
            }
            return response.json();
        },
    });

    const entries: TimeEntry[] = data?.entries || [];

    // Filter entries
    const filteredEntries = entries.filter((entry) => {
        if (userFilter && !entry.user.full_name.toLowerCase().includes(userFilter.toLowerCase())) {
            return false;
        }
        if (projectFilter && !entry.project.name.toLowerCase().includes(projectFilter.toLowerCase())) {
            return false;
        }
        return true;
    });

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (entryIds: string[]) => {
            const response = await fetch('/api/approvals/time-entries/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entry_ids: entryIds }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to approve entries');
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success('Tidrapporter godkända!');
            queryClient.invalidateQueries({ queryKey: ['time-entries-review'] });
            setSelectedEntries(new Set());
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Kunde inte godkänna tidrapporter');
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: async (entryIds: string[]) => {
            const response = await fetch('/api/approvals/time-entries/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entry_ids: entryIds }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to reject entries');
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success('Tidrapporter avvisade');
            queryClient.invalidateQueries({ queryKey: ['time-entries-review'] });
            setSelectedEntries(new Set());
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Kunde inte avvisa tidrapporter');
        },
    });

    const toggleSelectAll = () => {
        if (selectedEntries.size === filteredEntries.length) {
            setSelectedEntries(new Set());
        } else {
            setSelectedEntries(new Set(filteredEntries.map(e => e.id)));
        }
    };

    const toggleSelectEntry = (id: string) => {
        const newSelected = new Set(selectedEntries);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedEntries(newSelected);
    };

    const handleApproveSelected = () => {
        if (selectedEntries.size === 0) {
            toast.error('Välj minst en tidrapport att godkänna');
            return;
        }
        approveMutation.mutate(Array.from(selectedEntries));
    };

    const handleRejectSelected = () => {
        if (selectedEntries.size === 0) {
            toast.error('Välj minst en tidrapport att avvisa');
            return;
        }
        rejectMutation.mutate(Array.from(selectedEntries));
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return <Badge variant="secondary">Utkast</Badge>;
            case 'submitted':
                return <Badge variant="outline">Väntar</Badge>;
            case 'approved':
                return <Badge className="bg-green-500">Godkänd</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Avvisad</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-destructive">
                Ett fel uppstod vid hämtning av tidrapporter
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Sök användare..."
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Sök projekt..."
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Alla</SelectItem>
                        <SelectItem value="draft">Utkast</SelectItem>
                        <SelectItem value="submitted">Väntar</SelectItem>
                        <SelectItem value="approved">Godkända</SelectItem>
                        <SelectItem value="rejected">Avvisade</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Actions */}
            {selectedEntries.size > 0 && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                        {selectedEntries.size} valda
                    </span>
                    <Button
                        size="sm"
                        onClick={handleApproveSelected}
                        disabled={approveMutation.isPending}
                    >
                        {approveMutation.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        <Check className="w-4 h-4 mr-2" />
                        Godkänn
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleRejectSelected}
                        disabled={rejectMutation.isPending}
                    >
                        {rejectMutation.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        <X className="w-4 h-4 mr-2" />
                        Avvisa
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Användare</TableHead>
                            <TableHead>Projekt</TableHead>
                            <TableHead>Fas</TableHead>
                            <TableHead>Uppgift</TableHead>
                            <TableHead>Datum</TableHead>
                            <TableHead>Tid</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEntries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                    Inga tidrapporter att visa för vald period
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEntries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedEntries.has(entry.id)}
                                            onCheckedChange={() => toggleSelectEntry(entry.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {entry.user.full_name}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{entry.project.name}</div>
                                            {entry.project.project_number && (
                                                <div className="text-xs text-muted-foreground">
                                                    {entry.project.project_number}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {entry.phase?.name || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {entry.task_label || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(entry.start_at).toLocaleDateString('sv-SE')}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        {formatDuration(entry.duration_min)}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(entry.status)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setRequestChangesEntry(entry)}
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Request Changes Dialog */}
            {requestChangesEntry && (
                <RequestChangesDialog
                    open={!!requestChangesEntry}
                    onOpenChange={(open) => !open && setRequestChangesEntry(null)}
                    entry={requestChangesEntry}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['time-entries-review'] });
                        setRequestChangesEntry(null);
                    }}
                />
            )}
        </div>
    );
}

