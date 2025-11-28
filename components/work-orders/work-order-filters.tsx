'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface Project {
	id: string;
	name: string;
	project_number?: string;
}

interface Customer {
	id: string;
	type: 'COMPANY' | 'PRIVATE';
	company_name?: string;
	first_name?: string;
	last_name?: string;
}

interface User {
	id: string;
	full_name?: string;
	email?: string;
}

interface WorkOrderFiltersProps {
	projects: Project[];
	customers: Customer[];
	users: User[];
	onClose: () => void;
}

export function WorkOrderFilters({
	projects,
	customers,
	users,
	onClose,
}: WorkOrderFiltersProps) {
	const ALL_VALUE = 'all';
	const router = useRouter();
	const searchParams = useSearchParams();

	const [status, setStatus] = useState(searchParams.get('status') || '');
	const [projectId, setProjectId] = useState(searchParams.get('project_id') || '');
	const [customerId, setCustomerId] = useState(searchParams.get('customer_id') || '');
	const [userId, setUserId] = useState(searchParams.get('user_id') || '');
	const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
	const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');

	const handleApply = () => {
		const params = new URLSearchParams();
		
		if (status) params.set('status', status);
		if (projectId) params.set('project_id', projectId);
		if (customerId) params.set('customer_id', customerId);
		if (userId) params.set('user_id', userId);
		if (startDate) params.set('start_date', startDate);
		if (endDate) params.set('end_date', endDate);

		const queryString = params.toString();
		router.push(`/dashboard/work-orders${queryString ? `?${queryString}` : ''}`);
		router.refresh();
		onClose();
	};

	const handleClear = () => {
		setStatus('');
		setProjectId('');
		setCustomerId('');
		setUserId('');
		setStartDate('');
		setEndDate('');
		router.push('/dashboard/work-orders');
		router.refresh();
		onClose();
	};

	const getCustomerName = (customer: Customer) => {
		if (customer.type === 'COMPANY') {
			return customer.company_name || 'Namnlös kund';
		}
		const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
		return name || 'Namnlös kund';
	};

	// Debug: Log customers to console
	useEffect(() => {
		if (customers) {
			console.log('[WorkOrderFilters] Customers:', customers.length, customers);
		}
	}, [customers]);

	return (
		<Card className='mb-4'>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<CardTitle>Filter</CardTitle>
					<Button variant='ghost' size='icon' onClick={onClose}>
						<X className='h-4 w-4' />
					</Button>
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div className='space-y-2'>
						<Label htmlFor='status'>Status</Label>
						<Select
							value={status || ALL_VALUE}
							onValueChange={(value) => setStatus(value === ALL_VALUE ? '' : value)}
						>
							<SelectTrigger id='status'>
								<SelectValue placeholder='Alla status' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_VALUE}>Alla status</SelectItem>
								<SelectItem value='PLANERAD'>Planerad</SelectItem>
								<SelectItem value='PÅGÅENDE'>Pågående</SelectItem>
								<SelectItem value='KLAR'>Klar</SelectItem>
								<SelectItem value='FAKTURERAD'>Fakturerad</SelectItem>
								<SelectItem value='AVBOKAD'>Avbokad</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='project'>Projekt</Label>
						<Select
							value={projectId || ALL_VALUE}
							onValueChange={(value) => setProjectId(value === ALL_VALUE ? '' : value)}
						>
							<SelectTrigger id='project'>
								<SelectValue placeholder='Alla projekt' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_VALUE}>Alla projekt</SelectItem>
								{projects.map((project) => (
									<SelectItem key={project.id} value={project.id}>
										{project.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='customer'>Kund</Label>
						<Select
							value={customerId || ALL_VALUE}
							onValueChange={(value) => setCustomerId(value === ALL_VALUE ? '' : value)}
						>
							<SelectTrigger id='customer'>
								<SelectValue placeholder='Alla kunder' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_VALUE}>Alla kunder</SelectItem>
								{customers && customers.length > 0 ? (
									customers.map((customer) => (
										<SelectItem key={customer.id} value={customer.id}>
											{getCustomerName(customer)}
										</SelectItem>
									))
								) : (
									<SelectItem value='' disabled>
										Inga kunder tillgängliga
									</SelectItem>
								)}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='user'>Tilldelad användare</Label>
						<Select
							value={userId || ALL_VALUE}
							onValueChange={(value) => setUserId(value === ALL_VALUE ? '' : value)}
						>
							<SelectTrigger id='user'>
								<SelectValue placeholder='Alla användare' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_VALUE}>Alla användare</SelectItem>
								{users.map((user) => (
									<SelectItem key={user.id} value={user.id}>
										{user.full_name || user.email}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='start_date'>Från datum</Label>
						<Input
							id='start_date'
							type='date'
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='end_date'>Till datum</Label>
						<Input
							id='end_date'
							type='date'
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
				</div>

				<div className='flex gap-2 pt-4'>
					<Button onClick={handleApply}>Applicera filter</Button>
					<Button variant='outline' onClick={handleClear}>
						Rensa filter
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

