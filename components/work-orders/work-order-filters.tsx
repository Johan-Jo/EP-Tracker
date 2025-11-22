'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
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
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [startDate, setStartDate] = useState(
		searchParams.get('start_date') || ''
	);
	const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');
	const [status, setStatus] = useState(searchParams.get('status') || '');
	const [projectId, setProjectId] = useState(
		searchParams.get('project_id') || ''
	);
	const [customerId, setCustomerId] = useState(
		searchParams.get('customer_id') || ''
	);
	const [userId, setUserId] = useState(searchParams.get('user_id') || '');

	const applyFilters = () => {
		const params = new URLSearchParams();
		if (startDate) params.set('start_date', startDate);
		if (endDate) params.set('end_date', endDate);
		if (status) params.set('status', status);
		if (projectId) params.set('project_id', projectId);
		if (customerId) params.set('customer_id', customerId);
		if (userId) params.set('user_id', userId);

		router.push(`${pathname}?${params.toString()}`);
		onClose();
	};

	const clearFilters = () => {
		setStartDate('');
		setEndDate('');
		setStatus('');
		setProjectId('');
		setCustomerId('');
		setUserId('');
		router.push(pathname);
		onClose();
	};

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<CardTitle>Filter</CardTitle>
					<Button variant='ghost' size='icon' onClick={onClose}>
						<X className='w-4 h-4' />
					</Button>
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid gap-4 md:grid-cols-2'>
					<div className='space-y-2'>
						<Label>Från datum</Label>
						<Input
							type='date'
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div className='space-y-2'>
						<Label>Till datum</Label>
						<Input
							type='date'
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
					<div className='space-y-2'>
						<Label>Status</Label>
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger>
								<SelectValue placeholder='Alla statusar' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value=''>Alla statusar</SelectItem>
								<SelectItem value='PLANERAD'>Planerad</SelectItem>
								<SelectItem value='PÅGÅENDE'>Pågående</SelectItem>
								<SelectItem value='KLAR'>Klar</SelectItem>
								<SelectItem value='FAKTURERAD'>Fakturerad</SelectItem>
								<SelectItem value='AVBOKAD'>Avbokad</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-2'>
						<Label>Projekt</Label>
						<Select value={projectId} onValueChange={setProjectId}>
							<SelectTrigger>
								<SelectValue placeholder='Alla projekt' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value=''>Alla projekt</SelectItem>
								{projects.map((project) => (
									<SelectItem key={project.id} value={project.id}>
										{project.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-2'>
						<Label>Kund</Label>
						<Select value={customerId} onValueChange={setCustomerId}>
							<SelectTrigger>
								<SelectValue placeholder='Alla kunder' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value=''>Alla kunder</SelectItem>
								{customers.map((customer) => (
									<SelectItem key={customer.id} value={customer.id}>
										{customer.type === 'COMPANY'
											? customer.company_name
											: `${customer.first_name || ''} ${customer.last_name || ''}`.trim()}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-2'>
						<Label>Tilldelad användare</Label>
						<Select value={userId} onValueChange={setUserId}>
							<SelectTrigger>
								<SelectValue placeholder='Alla användare' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value=''>Alla användare</SelectItem>
								{users.map((user) => (
									<SelectItem key={user.id} value={user.id}>
										{user.full_name || user.email}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className='flex gap-2 justify-end'>
					<Button variant='outline' onClick={clearFilters}>
						Rensa filter
					</Button>
					<Button onClick={applyFilters}>Applicera filter</Button>
				</div>
			</CardContent>
		</Card>
	);
}

