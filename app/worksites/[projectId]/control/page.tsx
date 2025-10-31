import { createClient } from '@/lib/supabase/server';

async function fetchJSON(path: string) {
	const res = await fetch(path, { cache: 'no-store' });
	if (!res.ok) throw new Error(`Failed to fetch ${path}`);
	return res.json();
}

export default async function ControlView({ params, searchParams }: { params: { projectId: string }, searchParams: { from?: string; to?: string } }) {
	const { projectId } = params;
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) {
		return (
			<div className='p-6'>
				<p className='text-sm text-muted-foreground'>Logga in för att visa kontrollvy.</p>
			</div>
		);
	}

	const query = new URLSearchParams();
	if (searchParams?.from) query.set('from', searchParams.from);
	if (searchParams?.to) query.set('to', searchParams.to);

	const [active, sessions] = await Promise.all([
		fetchJSON(`/api/worksites/${projectId}/active`),
		fetchJSON(`/api/worksites/${projectId}/sessions?${query.toString()}`),
	]);

	return (
		<div className='p-6 space-y-6'>
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-2xl font-bold'>Kontrollvy</h1>
					<p className='text-sm text-muted-foreground'>Projekt: {active?.project?.name} • {active?.project?.worksite_code || '—'}</p>
				</div>
				<div className='text-sm text-muted-foreground'>
					Status: {active?.active ? 'Aktiv' : 'Av'}
				</div>
			</div>

			<div className='overflow-x-auto rounded-md border'>
				<table className='w-full text-sm'>
					<thead className='bg-muted/40'>
						<tr>
							<th className='text-left p-2'>Namn</th>
							<th className='text-left p-2'>In</th>
							<th className='text-left p-2'>Ut</th>
							<th className='text-left p-2'>Källa</th>
						</tr>
					</thead>
					<tbody>
						{sessions?.sessions?.map((s: any) => (
							<tr key={s.id} className='border-t'>
								<td className='p-2'>{s.name || s.person_id}</td>
								<td className='p-2'>{new Date(s.check_in_ts).toLocaleString()}</td>
								<td className='p-2'>{s.check_out_ts ? new Date(s.check_out_ts).toLocaleString() : '—'}</td>
								<td className='p-2'>{s.source_last}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
