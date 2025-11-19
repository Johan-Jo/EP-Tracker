'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface EmployeeMapping {
	id?: string;
	person_id: string;
	fortnox_employee_id: string;
	person?: {
		id: string;
		full_name: string;
		email: string;
	};
}

interface WageCodeMapping {
	id?: string;
	ep_wage_type: string;
	fortnox_salary_code: string;
	description?: string;
	is_active: boolean;
}

interface FortnoxPayrollMappingsProps {
	orgId: string;
}

export function FortnoxPayrollMappings({ orgId }: FortnoxPayrollMappingsProps) {
	const queryClient = useQueryClient();

	// Fetch mappings
	const { data, isLoading } = useQuery<{
		employeeMappings: EmployeeMapping[];
		wageCodeMappings: WageCodeMapping[];
	}>({
		queryKey: ['fortnox-payroll-mappings', orgId],
		queryFn: async () => {
			const response = await fetch('/api/integrations/fortnox/payroll-mappings');
			if (!response.ok) {
				throw new Error('Kunde inte hämta mappningar');
			}
			return response.json();
		},
	});

	// Fetch employees for dropdown - get from memberships
	const { data: employeesData } = useQuery<Array<{ id: string; full_name: string; email: string }>>({
		queryKey: ['employees-for-mapping', orgId],
		queryFn: async () => {
			const response = await fetch('/api/organizations/members');
			if (!response.ok) {
				return [];
			}
			const data = await response.json();
			// Extract profiles from memberships
			return (data.members || []).map((m: any) => ({
				id: m.profiles?.id || m.user_id,
				full_name: m.profiles?.full_name || '',
				email: m.profiles?.email || '',
			})).filter((u: any) => u.id && u.full_name);
		},
	});

	const [newEmployeeMapping, setNewEmployeeMapping] = useState<{
		person_id: string;
		fortnox_employee_id: string;
	}>({ person_id: '', fortnox_employee_id: '' });

	const [newWageCodeMapping, setNewWageCodeMapping] = useState<{
		ep_wage_type: string;
		fortnox_salary_code: string;
	}>({ ep_wage_type: '', fortnox_salary_code: '' });

	// Employee mapping mutations
	const createEmployeeMapping = useMutation({
		mutationFn: async (mapping: { person_id: string; fortnox_employee_id: string }) => {
			const response = await fetch('/api/integrations/fortnox/payroll-mappings/employees', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(mapping),
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte skapa mappning');
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['fortnox-payroll-mappings', orgId] });
			setNewEmployeeMapping({ person_id: '', fortnox_employee_id: '' });
			toast.success('Employee-mappning skapad');
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const deleteEmployeeMapping = useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`/api/integrations/fortnox/payroll-mappings/employees/${id}`, {
				method: 'DELETE',
			});
			if (!response.ok) {
				throw new Error('Kunde inte ta bort mappning');
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['fortnox-payroll-mappings', orgId] });
			toast.success('Employee-mappning borttagen');
		},
		onError: () => {
			toast.error('Kunde inte ta bort mappning');
		},
	});

	// Wage code mapping mutations
	const createWageCodeMapping = useMutation({
		mutationFn: async (mapping: { ep_wage_type: string; fortnox_salary_code: string }) => {
			const response = await fetch('/api/integrations/fortnox/payroll-mappings/wage-codes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(mapping),
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte skapa mappning');
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['fortnox-payroll-mappings', orgId] });
			setNewWageCodeMapping({ ep_wage_type: '', fortnox_salary_code: '' });
			toast.success('Wage code-mappning skapad');
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const deleteWageCodeMapping = useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`/api/integrations/fortnox/payroll-mappings/wage-codes/${id}`, {
				method: 'DELETE',
			});
			if (!response.ok) {
				throw new Error('Kunde inte ta bort mappning');
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['fortnox-payroll-mappings', orgId] });
			toast.success('Wage code-mappning borttagen');
		},
		onError: () => {
			toast.error('Kunde inte ta bort mappning');
		},
	});

	if (isLoading) {
		return <div className='text-sm text-muted-foreground'>Laddar mappningar...</div>;
	}

	const employeeMappings = data?.employeeMappings || [];
	const wageCodeMappings = data?.wageCodeMappings || [];

	return (
		<div className='space-y-6'>
			{/* Employee Mappings */}
			<Card>
				<CardHeader>
					<CardTitle>Anställd-mappningar</CardTitle>
					<CardDescription>
						Mappa EP-Tracker anställda till Fortnox EmployeeId. EmployeeId måste existera i Fortnox Payroll.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex gap-2'>
						<Select
							value={newEmployeeMapping.person_id}
							onValueChange={(value) => setNewEmployeeMapping({ ...newEmployeeMapping, person_id: value })}
						>
							<SelectTrigger className='flex-1'>
								<SelectValue placeholder='Välj anställd' />
							</SelectTrigger>
							<SelectContent>
								{employeesData
									?.filter((emp) => !employeeMappings.some((m) => m.person_id === emp.id))
									.map((emp) => (
										<SelectItem key={emp.id} value={emp.id}>
											{emp.full_name} ({emp.email})
										</SelectItem>
									))}
							</SelectContent>
						</Select>
						<Input
							placeholder='Fortnox EmployeeId'
							value={newEmployeeMapping.fortnox_employee_id}
							onChange={(e) =>
								setNewEmployeeMapping({ ...newEmployeeMapping, fortnox_employee_id: e.target.value })
							}
							className='w-48'
						/>
						<Button
							onClick={() => {
								if (newEmployeeMapping.person_id && newEmployeeMapping.fortnox_employee_id) {
									createEmployeeMapping.mutate(newEmployeeMapping);
								}
							}}
							disabled={!newEmployeeMapping.person_id || !newEmployeeMapping.fortnox_employee_id}
						>
							<Plus className='mr-2 h-4 w-4' /> Lägg till
						</Button>
					</div>

					{employeeMappings.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Anställd</TableHead>
									<TableHead>Fortnox EmployeeId</TableHead>
									<TableHead className='w-20'></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{employeeMappings.map((mapping) => (
									<TableRow key={mapping.id || mapping.person_id}>
										<TableCell>
											{mapping.person?.full_name || mapping.person_id}
											{mapping.person?.email && (
												<span className='text-xs text-muted-foreground ml-2'>
													({mapping.person.email})
												</span>
											)}
										</TableCell>
										<TableCell className='font-mono'>{mapping.fortnox_employee_id}</TableCell>
										<TableCell>
											<Button
												variant='ghost'
												size='sm'
												onClick={() => {
													if (mapping.id && confirm('Är du säker på att du vill ta bort denna mappning?')) {
														deleteEmployeeMapping.mutate(mapping.id);
													}
												}}
											>
												<Trash2 className='h-4 w-4 text-destructive' />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<p className='text-sm text-muted-foreground'>Inga employee-mappningar konfigurerade ännu.</p>
					)}
				</CardContent>
			</Card>

			{/* Wage Code Mappings */}
			<Card>
				<CardHeader>
					<CardTitle>Lönearter-mappningar</CardTitle>
					<CardDescription>
						Mappa EP-Tracker lönetyper till Fortnox SalaryCode. SalaryCode måste existera i Fortnox Payroll.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex gap-2'>
						<Select
							value={newWageCodeMapping.ep_wage_type}
							onValueChange={(value) => setNewWageCodeMapping({ ...newWageCodeMapping, ep_wage_type: value })}
						>
							<SelectTrigger className='w-48'>
								<SelectValue placeholder='Välj lönetyp' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='normal'>Normal (normaltimmar)</SelectItem>
								<SelectItem value='overtime'>Övertid (overtime)</SelectItem>
								<SelectItem value='ob'>OB (natt/helg/helgdag)</SelectItem>
							</SelectContent>
						</Select>
						<Input
							placeholder='Fortnox SalaryCode (t.ex. "100")'
							value={newWageCodeMapping.fortnox_salary_code}
							onChange={(e) =>
								setNewWageCodeMapping({ ...newWageCodeMapping, fortnox_salary_code: e.target.value })
							}
							className='w-48'
						/>
						<Button
							onClick={() => {
								if (newWageCodeMapping.ep_wage_type && newWageCodeMapping.fortnox_salary_code) {
									createWageCodeMapping.mutate(newWageCodeMapping);
								}
							}}
							disabled={!newWageCodeMapping.ep_wage_type || !newWageCodeMapping.fortnox_salary_code}
						>
							<Plus className='mr-2 h-4 w-4' /> Lägg till
						</Button>
					</div>

					{wageCodeMappings.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>EP-Tracker Lönetyp</TableHead>
									<TableHead>Fortnox SalaryCode</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className='w-20'></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{wageCodeMappings.map((mapping) => (
									<TableRow key={mapping.id || mapping.ep_wage_type}>
										<TableCell className='font-medium'>{mapping.ep_wage_type}</TableCell>
										<TableCell className='font-mono'>{mapping.fortnox_salary_code}</TableCell>
										<TableCell>
											{mapping.is_active ? (
												<span className='text-emerald-600'>Aktiv</span>
											) : (
												<span className='text-muted-foreground'>Inaktiv</span>
											)}
										</TableCell>
										<TableCell>
											<Button
												variant='ghost'
												size='sm'
												onClick={() => {
													if (mapping.id && confirm('Är du säker på att du vill ta bort denna mappning?')) {
														deleteWageCodeMapping.mutate(mapping.id);
													}
												}}
											>
												<Trash2 className='h-4 w-4 text-destructive' />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<p className='text-sm text-muted-foreground'>Inga wage code-mappningar konfigurerade ännu.</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

