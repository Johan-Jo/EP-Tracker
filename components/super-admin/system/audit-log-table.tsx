'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { AuditLog } from '@/lib/super-admin/audit-logs';

const ALL_ACTIONS_SELECT_VALUE = '__all_actions__';
const ALL_RESOURCE_TYPES_SELECT_VALUE = '__all_resource_types__';

interface AuditLogTableProps {
	initialLogs: AuditLog[];
	initialTotal: number;
	availableActions: string[];
	availableResourceTypes: string[];
}

export function AuditLogTable({ initialLogs, initialTotal, availableActions, availableResourceTypes }: AuditLogTableProps) {
	const [logs, setLogs] = useState(initialLogs);
	const [total, setTotal] = useState(initialTotal);
	const [loading, setLoading] = useState(false);

	// Filters
	const [action, setAction] = useState<string>('');
	const [resourceType, setResourceType] = useState<string>('');
	const [startDate, setStartDate] = useState<string>('');
	const [endDate, setEndDate] = useState<string>('');

	// Pagination
	const [page, setPage] = useState(1);
	const limit = 50;
	const offset = (page - 1) * limit;
	const totalPages = Math.ceil(total / limit);

	async function fetchLogs() {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (action) params.append('action', action);
			if (resourceType) params.append('resource_type', resourceType);
			if (startDate) params.append('start_date', startDate);
			if (endDate) params.append('end_date', endDate);
			params.append('limit', limit.toString());
			params.append('offset', offset.toString());

			const response = await fetch(`/api/super-admin/logs?${params}`);
			if (!response.ok) {
				throw new Error('Kunde inte hämta loggar');
			}

			const data = await response.json();
			setLogs(data.logs);
			setTotal(data.total);
		} catch (error) {
			console.error('Error fetching logs:', error);
			toast.error('Kunde inte hämta loggar');
		} finally {
			setLoading(false);
		}
	}

	async function handleExport() {
		try {
			toast.loading('Exporterar loggar...');

			const response = await fetch('/api/super-admin/logs/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filters: {
						action: action || undefined,
						resource_type: resourceType || undefined,
						start_date: startDate || undefined,
						end_date: endDate || undefined,
					},
				}),
			});

			if (!response.ok) {
				throw new Error('Kunde inte exportera loggar');
			}

			// Download CSV
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success('Loggar exporterade');
		} catch (error) {
			console.error('Error exporting logs:', error);
			toast.error('Kunde inte exportera loggar');
		}
	}

	function handleSearch() {
		setPage(1); // Reset to first page
		fetchLogs();
	}

	function handleClearFilters() {
		setAction('');
		setResourceType('');
		setStartDate('');
		setEndDate('');
		setPage(1);
		fetchLogs();
	}

	function handlePrevPage() {
		if (page > 1) {
			setPage(page - 1);
			fetchLogs();
		}
	}

	function handleNextPage() {
		if (page < totalPages) {
			setPage(page + 1);
			fetchLogs();
		}
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Granskningsloggar</CardTitle>
						<CardDescription>
							{total} {total === 1 ? 'händelse' : 'händelser'} totalt
						</CardDescription>
					</div>
					<Button onClick={handleExport} variant="outline">
						<Download className="w-4 h-4 mr-2" />
						Exportera CSV
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Filters */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<div className="space-y-2">
						<Label htmlFor="action">Action</Label>
						<Select
							value={action || ALL_ACTIONS_SELECT_VALUE}
							onValueChange={(value) => setAction(value === ALL_ACTIONS_SELECT_VALUE ? '' : value)}
						>
							<SelectTrigger id="action">
								<SelectValue placeholder="Alla" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_ACTIONS_SELECT_VALUE}>Alla</SelectItem>
								{availableActions.map(a => (
									<SelectItem key={a} value={a}>{a}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="resource_type">Resurstyp</Label>
						<Select
							value={resourceType || ALL_RESOURCE_TYPES_SELECT_VALUE}
							onValueChange={(value) =>
								setResourceType(value === ALL_RESOURCE_TYPES_SELECT_VALUE ? '' : value)
							}
						>
							<SelectTrigger id="resource_type">
								<SelectValue placeholder="Alla" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_RESOURCE_TYPES_SELECT_VALUE}>Alla</SelectItem>
								{availableResourceTypes.map(rt => (
									<SelectItem key={rt} value={rt}>{rt}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="start_date">Från datum</Label>
						<Input
							type="date"
							id="start_date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="end_date">Till datum</Label>
						<Input
							type="date"
							id="end_date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
				</div>

				<div className="flex gap-2">
					<Button onClick={handleSearch} disabled={loading}>
						<Search className="w-4 h-4 mr-2" />
						Sök
					</Button>
					<Button onClick={handleClearFilters} variant="outline">
						Rensa filter
					</Button>
				</div>

				{/* Table */}
				<div className="rounded-md border">
					<table className="w-full text-sm">
						<thead className="bg-muted">
							<tr>
								<th className="p-3 text-left font-medium">Tidpunkt</th>
								<th className="p-3 text-left font-medium">Admin</th>
								<th className="p-3 text-left font-medium">Action</th>
								<th className="p-3 text-left font-medium">Resurs</th>
								<th className="p-3 text-left font-medium">Metadata</th>
							</tr>
						</thead>
						<tbody>
							{logs.length === 0 ? (
								<tr>
									<td colSpan={5} className="p-8 text-center text-muted-foreground">
										Inga loggar hittades
									</td>
								</tr>
							) : (
								logs.map((log) => (
									<tr key={log.id} className="border-t hover:bg-muted/50">
										<td className="p-3">
											{new Date(log.created_at).toLocaleString('sv-SE')}
										</td>
										<td className="p-3">
											<div>{log.admin_name || 'Okänd'}</div>
											<div className="text-xs text-muted-foreground">
												{log.admin_email}
											</div>
										</td>
										<td className="p-3">
											<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
												{log.action}
											</span>
										</td>
										<td className="p-3">
											{log.resource_type && (
												<div>
													<div className="font-medium">{log.resource_type}</div>
													{log.resource_id && (
														<div className="text-xs text-muted-foreground">
															{log.resource_id}
														</div>
													)}
												</div>
											)}
										</td>
										<td className="p-3">
											{log.metadata && (
												<pre className="text-xs max-w-xs overflow-auto">
													{JSON.stringify(log.metadata, null, 2)}
												</pre>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between">
						<div className="text-sm text-muted-foreground">
							Sida {page} av {totalPages}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handlePrevPage}
								disabled={page === 1 || loading}
							>
								<ChevronLeft className="w-4 h-4" />
								Föregående
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleNextPage}
								disabled={page === totalPages || loading}
							>
								Nästa
								<ChevronRight className="w-4 h-4" />
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

