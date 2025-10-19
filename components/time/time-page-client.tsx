'use client';

import { Suspense, lazy, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Users, List, Loader2 } from 'lucide-react';

// Lazy load heavy components
const TimeEntryForm = lazy(() => import('@/components/time/time-entry-form').then(m => ({ default: m.TimeEntryForm })));
const TimeEntriesList = lazy(() => import('@/components/time/time-entries-list').then(m => ({ default: m.TimeEntriesList })));
const CrewClockIn = lazy(() => import('@/components/time/crew-clock-in').then(m => ({ default: m.CrewClockIn })));

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
				<TabsTrigger value="manual">
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

			{/* List Tab - Lazy loaded */}
			<TabsContent value="list" className="space-y-4">
				<Suspense fallback={<TabLoading />}>
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
				</Suspense>
			</TabsContent>

			{/* Manual Entry Tab - Lazy loaded */}
			<TabsContent value="manual">
				<Suspense fallback={<TabLoading />}>
					<TimeEntryForm orgId={orgId} />
				</Suspense>
			</TabsContent>

			{/* Crew Tab - Lazy loaded (only for admins/foremen) */}
			{canManageCrew && (
				<TabsContent value="crew">
					<Suspense fallback={<TabLoading />}>
						<CrewClockIn orgId={orgId} />
					</Suspense>
				</TabsContent>
			)}
		</Tabs>
	);
}

