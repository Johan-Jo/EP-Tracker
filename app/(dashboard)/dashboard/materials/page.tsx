import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function MaterialsPage() {
	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight'>Material & Kostnader</h1>
				<p className='text-muted-foreground mt-2'>
					Spåra material, kostnader och milersättning
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className='flex items-center gap-3'>
						<Package className='w-8 h-8 text-primary' />
						<div>
							<CardTitle>Kommer i EPIC 5</CardTitle>
							<CardDescription>
								Materials, Expenses & Mileage
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground'>
						Material- och kostnadsfunktioner kommer att implementeras i EPIC 5, inklusive:
					</p>
					<ul className='list-disc list-inside space-y-2 mt-4 text-sm text-muted-foreground'>
						<li>Materialregistrering med foto</li>
						<li>Kostnadsrapporter</li>
						<li>Milersättning</li>
						<li>Restid</li>
						<li>Kvittohantering</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}

