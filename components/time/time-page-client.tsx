'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Users, List, Loader2 } from 'lucide-react';

// Use Next.js dynamic() for better code splitting (no SSR for client-only components)
const TimeEntryForm = dynamic(() => import('@/components/time/time-entry-form').then(m => ({ default: m.TimeEntryForm })), {
	loading: () => <TabLoading />,
	ssr: false,
});

const TimeEntriesList = dynamic(() => import('@/components/time/time-entries-list').then(m => ({ default: m.TimeEntriesList })), {
	loading: () => <TabLoading />,
	ssr: false,
});

const CrewClockIn = dynamic(() => import('@/components/time/crew-clock-in').then(m => ({ default: m.CrewClockIn })), {
	loading: () => <TabLoading />,
	ssr: false,
});

// Loading component
function TabLoading() {
	return (
		<div className='flex items-center justify-center min-h-[400px]'>
			<Loader2 className='w-8 h-8 animate-spin text-primary' />
		</div>
	);
}

interface TimePageClientProps {
	orgId: string;
	canManageCrew: boolean;
}

export function TimePageClient({ orgId, canManageCrew }: TimePageClientProps) {
	const [editingEntry, setEditingEntry] = useState<any | null>(null);

	const handleEdit = (entry: any) => {
		setEditingEntry(entry);
	};

	const handleEditSuccess = () => {
		setEditingEntry(null);
	};

	const handleEditCancel = () => {
		setEditingEntry(null);
	};

	return (
		<Tabs defaultValue="list" className="space-y-6">
			<TabsList>
			<TabsTrigger value="list">
				<List className="w-4 h-4 mr-2" />
				Översikt
			</TabsTrigger>
			<TabsTrigger value="manual" data-tour="add-time">
				<Clock className="w-4 h-4 mr-2" />
				Lägg till tid
			</TabsTrigger>
				{canManageCrew && (
					<TabsTrigger value="crew">
						<Users className="w-4 h-4 mr-2" />
						Starta bemanning
					</TabsTrigger>
				)}
			</TabsList>

			{/* List Tab - Dynamically loaded */}
			<TabsContent value="list" className="space-y-4">
				{editingEntry ? (
					<TimeEntryForm 
						orgId={orgId} 
						initialData={editingEntry}
						onSuccess={handleEditSuccess}
						onCancel={handleEditCancel}
					/>
				) : (
					<TimeEntriesList 
						orgId={orgId} 
						onEdit={handleEdit}
					/>
				)}
			</TabsContent>

			{/* Manual Entry Tab - Dynamically loaded */}
			<TabsContent value="manual">
				<TimeEntryForm orgId={orgId} />
			</TabsContent>

			{/* Crew Tab - Dynamically loaded (only for admins/foremen) */}
			{canManageCrew && (
				<TabsContent value="crew">
					<CrewClockIn orgId={orgId} />
				</TabsContent>
			)}
		</Tabs>
	);
}

