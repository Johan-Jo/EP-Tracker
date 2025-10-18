import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function TimePage() {
	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight'>Tidrapportering</h1>
				<p className='text-muted-foreground mt-2'>
					Logga arbetstid och bemanning
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className='flex items-center gap-3'>
						<Clock className='w-8 h-8 text-primary' />
						<div>
							<CardTitle>Kommer i EPIC 4</CardTitle>
							<CardDescription>
								Time Tracking & Crew Management
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground'>
						Tidrapporteringsfunktioner kommer att implementeras i EPIC 4, inklusive:
					</p>
					<ul className='list-disc list-inside space-y-2 mt-4 text-sm text-muted-foreground'>
						<li>Start/stopp timer</li>
						<li>Manuell tidregistrering</li>
						<li>Crew clock-in (bemanning)</li>
						<li>Tidrapportsöversikt</li>
						<li>Godkännandeflöde</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}

