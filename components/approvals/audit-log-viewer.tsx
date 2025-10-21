'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AuditLog {
	id: string;
	user_id: string;
	org_id: string;
	action: string;
	entity_type: string;
	entity_id: string | null;
	details: Record<string, any> | null;
	created_at: string;
	user?: {
		full_name: string;
		email: string;
	};
}

interface AuditLogViewerProps {
	orgId: string;
}

// Action translations
const actionLabels: Record<string, string> = {
	create: 'Skapad',
	update: 'Uppdaterad',
	delete: 'Raderad',
	approve: 'Godkänd',
	reject: 'Avvisad',
	lock_period: 'Lås period',
	unlock_period: 'Lås upp period',
	grant_super_admin: 'Beviljad Super Admin',
	revoke_super_admin: 'Återkallad Super Admin',
};

// Entity type translations
const entityLabels: Record<string, string> = {
	time_entry: 'Tidrapport',
	material: 'Material',
	expense: 'Utlägg',
	mileage: 'Milersättning',
	ata: 'ÄTA',
	diary_entry: 'Dagbokspost',
	checklist: 'Checklista',
	project: 'Projekt',
	organization: 'Organisation',
	user: 'Användare',
	period_lock: 'Periodlås',
};

// Action colors
const actionColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	create: 'default',
	update: 'secondary',
	delete: 'destructive',
	approve: 'default',
	reject: 'destructive',
	lock_period: 'secondary',
	unlock_period: 'outline',
};

export function AuditLogViewer({ orgId }: AuditLogViewerProps) {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);
	const [offset, setOffset] = useState(0);
	const [filters, setFilters] = useState({
		entity_type: '',
		action: '',
		start_date: '',
		end_date: '',
	});
	const limit = 50;

	useEffect(() => {
		fetchLogs();
	}, [offset, filters]);

	async function fetchLogs() {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				limit: limit.toString(),
				offset: offset.toString(),
			});

			if (filters.entity_type) params.append('entity_type', filters.entity_type);
			if (filters.action) params.append('action', filters.action);
			if (filters.start_date) params.append('start_date', filters.start_date);
			if (filters.end_date) params.append('end_date', filters.end_date);

			const response = await fetch(`/api/audit-logs?${params.toString()}`);
			if (!response.ok) throw new Error('Failed to fetch audit logs');

			const data = await response.json();
			setLogs(data.logs || []);
			setTotal(data.total || 0);
		} catch (error) {
			console.error('Error fetching audit logs:', error);
			toast.error('Kunde inte ladda granskningsloggar');
		} finally {
			setLoading(false);
		}
	}

	function handleFilterChange(key: string, value: string) {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setOffset(0); // Reset to first page
	}

	function clearFilters() {
		setFilters({
			entity_type: '',
			action: '',
			start_date: '',
			end_date: '',
		});
		setOffset(0);
	}

	function nextPage() {
		if (offset + limit < total) {
			setOffset(offset + limit);
		}
	}

	function previousPage() {
		if (offset > 0) {
			setOffset(Math.max(0, offset - limit));
		}
	}

	return (
		<div className="space-y-4">
			{/* Filters Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filter
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<Label htmlFor="entity_type">Entitetstyp</Label>
							<Select
								value={filters.entity_type}
								onValueChange={(value) => handleFilterChange('entity_type', value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Alla" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Alla</SelectItem>
									{Object.entries(entityLabels).map(([key, label]) => (
										<SelectItem key={key} value={key}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="action">Åtgärd</Label>
							<Select
								value={filters.action}
								onValueChange={(value) => handleFilterChange('action', value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Alla" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Alla</SelectItem>
									{Object.entries(actionLabels).map(([key, label]) => (
										<SelectItem key={key} value={key}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="start_date">Från datum</Label>
							<Input
								id="start_date"
								type="date"
								value={filters.start_date}
								onChange={(e) => handleFilterChange('start_date', e.target.value)}
							/>
						</div>

						<div>
							<Label htmlFor="end_date">Till datum</Label>
							<Input
								id="end_date"
								type="date"
								value={filters.end_date}
								onChange={(e) => handleFilterChange('end_date', e.target.value)}
							/>
						</div>
					</div>

					<div className="mt-4 flex gap-2">
						<Button onClick={fetchLogs} size="sm">
							<Search className="h-4 w-4 mr-2" />
							Sök
						</Button>
						<Button onClick={clearFilters} variant="outline" size="sm">
							Rensa filter
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Logs Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Shield className="h-5 w-5" />
								Granskningsloggar
							</CardTitle>
							<CardDescription>
								Visar {offset + 1} - {Math.min(offset + limit, total)} av {total} händelser
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<p className="text-sm text-muted-foreground text-center py-8">Laddar...</p>
					) : logs.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">
							Inga granskningsloggar hittades
						</p>
					) : (
						<div className="space-y-2">
							{logs.map((log) => (
								<div
									key={log.id}
									className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 space-y-1">
											<div className="flex items-center gap-2 flex-wrap">
												<Badge variant={actionColors[log.action] || 'default'}>
													{actionLabels[log.action] || log.action}
												</Badge>
												<Badge variant="outline">
													{entityLabels[log.entity_type] || log.entity_type}
												</Badge>
												<span className="text-sm text-muted-foreground">
													av {log.user?.full_name || 'Okänd'}
												</span>
											</div>

											{log.details && Object.keys(log.details).length > 0 && (
												<details className="text-sm">
													<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
														Visa detaljer
													</summary>
													<pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
														{JSON.stringify(log.details, null, 2)}
													</pre>
												</details>
											)}
										</div>

										<div className="text-right text-sm text-muted-foreground whitespace-nowrap">
											<p>{new Date(log.created_at).toLocaleDateString('sv-SE')}</p>
											<p>{new Date(log.created_at).toLocaleTimeString('sv-SE')}</p>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Pagination */}
					{total > limit && (
						<div className="flex items-center justify-between mt-4 pt-4 border-t">
							<Button
								onClick={previousPage}
								disabled={offset === 0}
								variant="outline"
								size="sm"
							>
								<ChevronLeft className="h-4 w-4 mr-2" />
								Föregående
							</Button>

							<span className="text-sm text-muted-foreground">
								Sida {Math.floor(offset / limit) + 1} av {Math.ceil(total / limit)}
							</span>

							<Button
								onClick={nextPage}
								disabled={offset + limit >= total}
								variant="outline"
								size="sm"
							>
								Nästa
								<ChevronRight className="h-4 w-4 ml-2" />
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

