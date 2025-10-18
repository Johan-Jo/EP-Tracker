'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface ProjectsFilterProps {
	currentStatus: string;
}

export function ProjectsFilter({ currentStatus }: ProjectsFilterProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const handleStatusChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value === 'all') {
			params.delete('status');
		} else {
			params.set('status', value);
		}
		router.push(`/dashboard/projects?${params.toString()}`);
	};

	return (
		<Select value={currentStatus} onValueChange={handleStatusChange}>
			<SelectTrigger className='w-full md:w-[180px]'>
				<SelectValue placeholder='Filtrera status' />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value='all'>Alla projekt</SelectItem>
				<SelectItem value='active'>Aktiva</SelectItem>
				<SelectItem value='paused'>Pausade</SelectItem>
				<SelectItem value='completed'>Klara</SelectItem>
				<SelectItem value='archived'>Arkiverade</SelectItem>
			</SelectContent>
		</Select>
	);
}

