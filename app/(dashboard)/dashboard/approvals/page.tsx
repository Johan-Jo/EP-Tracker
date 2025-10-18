import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare } from 'lucide-react';

export default function ApprovalsPage() {
	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight'>Godkännanden</h1>
				<p className='text-muted-foreground mt-2'>
					Granska och godkänn tidrapporter och kostnader
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className='flex items-center gap-3'>
						<CheckSquare className='w-8 h-8 text-primary' />
						<div>
							<CardTitle>Kommer i EPIC 7</CardTitle>
							<CardDescription>
								Approvals & CSV Exports
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground'>
						Godkännandefunktioner kommer att implementeras i EPIC 7, inklusive:
					</p>
					<ul className='list-disc list-inside space-y-2 mt-4 text-sm text-muted-foreground'>
						<li>Veckoöversikt av tidrapporter</li>
						<li>Godkänn/avvisa tidrapporter</li>
						<li>Kommentarsfunktion</li>
						<li>CSV-export för lön</li>
						<li>CSV-export för fakturering</li>
						<li>Historik och granskningslogg</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}

