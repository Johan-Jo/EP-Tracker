'use client';

import { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ManageTeamDialog } from '@/components/projects/manage-team-dialog';

interface ProjectTeamTabProps {
	projectId: string;
	projectName: string;
	canEdit: boolean;
}

export function ProjectTeamTab({ projectId, projectName, canEdit }: ProjectTeamTabProps) {
	const [showTeamDialog, setShowTeamDialog] = useState(false);

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className='flex items-center gap-2'>
								<Users className='w-5 h-5' />
								Projektteam
							</CardTitle>
							<CardDescription>
								Hantera vilka användare som har tillgång till detta projekt
							</CardDescription>
						</div>
						{canEdit && (
							<Button onClick={() => setShowTeamDialog(true)}>
								<Plus className='w-4 h-4 mr-2' />
								Hantera team
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<h3 className="font-semibold text-sm text-blue-900 mb-2">ℹ️ Om projektåtkomst</h3>
							<ul className="text-sm text-blue-800 space-y-1">
								<li>• <strong>Arbetare</strong> kan bara se projekt de är tilldelade</li>
								<li>• <strong>Arbetsledare & Admins</strong> ser alla projekt automatiskt</li>
								<li>• Använd "Hantera team" för att lägga till arbetare i projektet</li>
							</ul>
						</div>

						{!canEdit && (
							<p className='text-sm text-muted-foreground'>
								Endast admins och arbetsledare kan hantera projektmedlemmar.
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			<ManageTeamDialog
				projectId={projectId}
				projectName={projectName}
				open={showTeamDialog}
				onOpenChange={setShowTeamDialog}
			/>
		</>
	);
}

