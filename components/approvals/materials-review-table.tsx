'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Check, X, Loader2, Package, Receipt, Car } from 'lucide-react';
import toast from 'react-hot-toast';

type Material = {
    id: string;
    description: string;
    quantity: number | null;
    unit: string | null;
    unit_price_sek: number | null;
    total_sek: number | null;
    status: string;
    user: { full_name: string };
    project: { name: string };
    created_at: string;
};

type Expense = {
    id: string;
    description: string;
    amount_sek: number;
    category: string | null;
    status: string;
    user: { full_name: string };
    project: { name: string };
    date: string;
};

type Mileage = {
    id: string;
    distance_km: number;
    rate_per_km: number;
    total_sek: number;
    from_location: string | null;
    to_location: string | null;
    status: string;
    user: { full_name: string };
    project: { name: string };
    date: string;
};

type MaterialsReviewTableProps = {
    orgId: string;
    periodStart: Date;
    periodEnd: Date;
};

export function MaterialsReviewTable({ 
    orgId, 
    periodStart, 
    periodEnd 
}: MaterialsReviewTableProps) {
    const queryClient = useQueryClient();
    const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
    const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
    const [selectedMileage, setSelectedMileage] = useState<Set<string>>(new Set());

    // Fetch materials
    const { data: materialsData, isLoading: materialsLoading } = useQuery({
        queryKey: ['materials-review', orgId, periodStart.toISOString(), periodEnd.toISOString()],
        queryFn: async () => {
            const params = new URLSearchParams({
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
                status: 'submitted',
            });
            const response = await fetch(`/api/approvals/materials?${params}`);
            if (!response.ok) throw new Error('Failed to fetch materials');
            return response.json();
        },
    });

    // Fetch expenses
    const { data: expensesData, isLoading: expensesLoading } = useQuery({
        queryKey: ['expenses-review', orgId, periodStart.toISOString(), periodEnd.toISOString()],
        queryFn: async () => {
            const params = new URLSearchParams({
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
                status: 'submitted',
            });
            const response = await fetch(`/api/approvals/expenses?${params}`);
            if (!response.ok) throw new Error('Failed to fetch expenses');
            return response.json();
        },
    });

    // Fetch mileage
    const { data: mileageData, isLoading: mileageLoading } = useQuery({
        queryKey: ['mileage-review', orgId, periodStart.toISOString(), periodEnd.toISOString()],
        queryFn: async () => {
            const params = new URLSearchParams({
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
                status: 'submitted',
            });
            const response = await fetch(`/api/approvals/mileage?${params}`);
            if (!response.ok) throw new Error('Failed to fetch mileage');
            return response.json();
        },
    });

    const materials: Material[] = materialsData?.materials || [];
    const expenses: Expense[] = expensesData?.expenses || [];
    const mileageEntries: Mileage[] = mileageData?.mileage || [];

    // Approve mutations
    const approveMaterialsMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const response = await fetch('/api/approvals/materials/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ material_ids: ids }),
            });
            if (!response.ok) throw new Error('Failed to approve materials');
            return response.json();
        },
        onSuccess: () => {
            toast.success('Material godkänt!');
            queryClient.invalidateQueries({ queryKey: ['materials-review'] });
            setSelectedMaterials(new Set());
        },
        onError: () => toast.error('Kunde inte godkänna material'),
    });

    const approveExpensesMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const response = await fetch('/api/approvals/expenses/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expense_ids: ids }),
            });
            if (!response.ok) throw new Error('Failed to approve expenses');
            return response.json();
        },
        onSuccess: () => {
            toast.success('Utlägg godkända!');
            queryClient.invalidateQueries({ queryKey: ['expenses-review'] });
            setSelectedExpenses(new Set());
        },
        onError: () => toast.error('Kunde inte godkänna utlägg'),
    });

    const approveMileageMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const response = await fetch('/api/approvals/mileage/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mileage_ids: ids }),
            });
            if (!response.ok) throw new Error('Failed to approve mileage');
            return response.json();
        },
        onSuccess: () => {
            toast.success('Miltal godkänt!');
            queryClient.invalidateQueries({ queryKey: ['mileage-review'] });
            setSelectedMileage(new Set());
        },
        onError: () => toast.error('Kunde inte godkänna miltal'),
    });

    return (
        <Tabs defaultValue="materials" className="space-y-4">
            <TabsList>
                <TabsTrigger value="materials">
                    <Package className="w-4 h-4 mr-2" />
                    Material ({materials.length})
                </TabsTrigger>
                <TabsTrigger value="expenses">
                    <Receipt className="w-4 h-4 mr-2" />
                    Utlägg ({expenses.length})
                </TabsTrigger>
                <TabsTrigger value="mileage">
                    <Car className="w-4 h-4 mr-2" />
                    Miltal ({mileageEntries.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="materials">
                {selectedMaterials.size > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg mb-4">
                        <span className="text-sm font-medium">{selectedMaterials.size} valda</span>
                        <Button
                            size="sm"
                            onClick={() => approveMaterialsMutation.mutate(Array.from(selectedMaterials))}
                            disabled={approveMaterialsMutation.isPending}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Godkänn
                        </Button>
                    </div>
                )}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedMaterials.size === materials.length && materials.length > 0}
                                        onCheckedChange={() => {
                                            if (selectedMaterials.size === materials.length) {
                                                setSelectedMaterials(new Set());
                                            } else {
                                                setSelectedMaterials(new Set(materials.map(m => m.id)));
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Användare</TableHead>
                                <TableHead>Projekt</TableHead>
                                <TableHead>Beskrivning</TableHead>
                                <TableHead>Antal</TableHead>
                                <TableHead>Enhetspris</TableHead>
                                <TableHead>Totalt</TableHead>
                                <TableHead>Datum</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materialsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : materials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        Inget material att granska
                                    </TableCell>
                                </TableRow>
                            ) : (
                                materials.map((material) => (
                                    <TableRow key={material.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedMaterials.has(material.id)}
                                                onCheckedChange={() => {
                                                    const newSelected = new Set(selectedMaterials);
                                                    if (newSelected.has(material.id)) {
                                                        newSelected.delete(material.id);
                                                    } else {
                                                        newSelected.add(material.id);
                                                    }
                                                    setSelectedMaterials(newSelected);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{material.user.full_name}</TableCell>
                                        <TableCell>{material.project.name}</TableCell>
                                        <TableCell>{material.description}</TableCell>
                                        <TableCell>{material.quantity} {material.unit}</TableCell>
                                        <TableCell>{material.unit_price_sek ? `${material.unit_price_sek} kr` : '-'}</TableCell>
                                        <TableCell className="font-medium">{material.total_sek ? `${material.total_sek} kr` : '-'}</TableCell>
                                        <TableCell>{new Date(material.created_at).toLocaleDateString('sv-SE')}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            <TabsContent value="expenses">
                {selectedExpenses.size > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg mb-4">
                        <span className="text-sm font-medium">{selectedExpenses.size} valda</span>
                        <Button
                            size="sm"
                            onClick={() => approveExpensesMutation.mutate(Array.from(selectedExpenses))}
                            disabled={approveExpensesMutation.isPending}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Godkänn
                        </Button>
                    </div>
                )}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedExpenses.size === expenses.length && expenses.length > 0}
                                        onCheckedChange={() => {
                                            if (selectedExpenses.size === expenses.length) {
                                                setSelectedExpenses(new Set());
                                            } else {
                                                setSelectedExpenses(new Set(expenses.map(e => e.id)));
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Användare</TableHead>
                                <TableHead>Projekt</TableHead>
                                <TableHead>Beskrivning</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Belopp</TableHead>
                                <TableHead>Datum</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expensesLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : expenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        Inga utlägg att granska
                                    </TableCell>
                                </TableRow>
                            ) : (
                                expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedExpenses.has(expense.id)}
                                                onCheckedChange={() => {
                                                    const newSelected = new Set(selectedExpenses);
                                                    if (newSelected.has(expense.id)) {
                                                        newSelected.delete(expense.id);
                                                    } else {
                                                        newSelected.add(expense.id);
                                                    }
                                                    setSelectedExpenses(newSelected);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{expense.user.full_name}</TableCell>
                                        <TableCell>{expense.project.name}</TableCell>
                                        <TableCell>{expense.description}</TableCell>
                                        <TableCell>{expense.category || '-'}</TableCell>
                                        <TableCell className="font-medium">{expense.amount_sek} kr</TableCell>
                                        <TableCell>{expense.date}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            <TabsContent value="mileage">
                {selectedMileage.size > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg mb-4">
                        <span className="text-sm font-medium">{selectedMileage.size} valda</span>
                        <Button
                            size="sm"
                            onClick={() => approveMileageMutation.mutate(Array.from(selectedMileage))}
                            disabled={approveMileageMutation.isPending}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Godkänn
                        </Button>
                    </div>
                )}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedMileage.size === mileageEntries.length && mileageEntries.length > 0}
                                        onCheckedChange={() => {
                                            if (selectedMileage.size === mileageEntries.length) {
                                                setSelectedMileage(new Set());
                                            } else {
                                                setSelectedMileage(new Set(mileageEntries.map(m => m.id)));
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Användare</TableHead>
                                <TableHead>Projekt</TableHead>
                                <TableHead>Från</TableHead>
                                <TableHead>Till</TableHead>
                                <TableHead>Km</TableHead>
                                <TableHead>Ersättning/km</TableHead>
                                <TableHead>Totalt</TableHead>
                                <TableHead>Datum</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mileageLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : mileageEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                        Inget miltal att granska
                                    </TableCell>
                                </TableRow>
                            ) : (
                                mileageEntries.map((mileage) => (
                                    <TableRow key={mileage.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedMileage.has(mileage.id)}
                                                onCheckedChange={() => {
                                                    const newSelected = new Set(selectedMileage);
                                                    if (newSelected.has(mileage.id)) {
                                                        newSelected.delete(mileage.id);
                                                    } else {
                                                        newSelected.add(mileage.id);
                                                    }
                                                    setSelectedMileage(newSelected);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{mileage.user.full_name}</TableCell>
                                        <TableCell>{mileage.project.name}</TableCell>
                                        <TableCell>{mileage.from_location || '-'}</TableCell>
                                        <TableCell>{mileage.to_location || '-'}</TableCell>
                                        <TableCell>{mileage.distance_km} km</TableCell>
                                        <TableCell>{mileage.rate_per_km} kr</TableCell>
                                        <TableCell className="font-medium">{mileage.total_sek} kr</TableCell>
                                        <TableCell>{mileage.date}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
        </Tabs>
    );
}

