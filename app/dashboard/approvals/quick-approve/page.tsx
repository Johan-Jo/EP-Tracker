import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { approveTimeEntries } from '@/lib/approvals/approve-time-entries';

type SearchParams = {
	mode?: 'single' | 'all';
	entryId?: string;
	userId?: string;
	action?: 'approve';
};

interface QuickApprovePageProps {
	searchParams: SearchParams;
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return 'Ett oväntat fel uppstod.';
}

export default async function QuickApprovePage({ searchParams }: QuickApprovePageProps) {
	const params = searchParams;
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<QuickApproveLayout
				status='error'
				title='Ingen organisation hittades'
				description='Vi kunde inte hitta en aktiv organisation för ditt konto. Kontakta support om problemet kvarstår.'
			/>
		);
	}

	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		return (
			<QuickApproveLayout
				status='error'
				title='Behörighet saknas'
				description='Endast administratörer eller arbetsledare kan godkänna tidrapporter.'
			/>
		);
	}

	const supabase = await createClient();

	try {
		const mode = params.mode;

		if (mode === 'single') {
			if (!params.entryId) {
				throw new Error('Tidrapport-ID saknas i länken.');
			}

			const { data: entry, error } = await supabase
				.from('time_entries')
				.select(
					`
						id,
						org_id,
						user_id,
						status,
						start_at,
						stop_at,
						duration_min,
						notes,
						project:projects(name),
						user:profiles!time_entries_user_id_fkey(full_name, email)
					`
				)
				.eq('id', params.entryId)
				.eq('org_id', membership.org_id)
				.single();

			if (error || !entry) {
				throw new Error('Tidrapporten kunde inte hittas eller så tillhör den inte din organisation.');
			}

			if (params.action === 'approve') {
				if (entry.status === 'approved') {
					return (
						<QuickApproveLayout
							status='success'
							title='Redan godkänd'
							description='Denna tidrapport är redan godkänd.'
						/>
					);
				}

				const { entries } = await approveTimeEntries({
					supabase,
					entryIds: [entry.id],
					approverId: user.id,
					orgId: membership.org_id,
				});

				if (entries.length === 0) {
					throw new Error('Ingen tidrapport kunde godkännas.');
				}

				return (
					<QuickApproveLayout
						status='success'
						title='Tidrapport godkänd'
						description='Tidrapporten har godkänts. Tack!'
					/>
				);
			}

			const { count: pendingCount } = await supabase
				.from('time_entries')
				.select('id', { head: true, count: 'exact' })
				.eq('org_id', membership.org_id)
				.eq('user_id', entry.user_id)
				.in('status', ['draft', 'submitted'])
				.not('stop_at', 'is', null);

			const approveUrl = `/dashboard/approvals/quick-approve?mode=single&entryId=${entry.id}&action=approve`;

			return <SingleEntryReview entry={entry} pendingCount={pendingCount ?? 1} approveUrl={approveUrl} />;
		}

		if (mode === 'all') {
			if (!params.userId) {
				throw new Error('Användar-ID saknas i länken.');
			}

			const { data: pendingEntries, error: pendingError } = await supabase
				.from('time_entries')
				.select(
					`
						id,
						org_id,
						user_id,
						project:projects(name),
						start_at,
						stop_at,
						duration_min,
						status
					`
				)
				.eq('org_id', membership.org_id)
				.eq('user_id', searchParams.userId)
				.in('status', ['draft', 'submitted'])
				.not('stop_at', 'is', null);

			if (pendingError) {
				throw new Error('Kunde inte hämta tidrapporter att godkänna.');
			}

			const entryIds = (pendingEntries ?? []).map((entry) => entry.id);

			if (entryIds.length === 0) {
				throw new Error('Det finns inga tidrapporter i vänteläge för denna medarbetare.');
			}

			if (params.action === 'approve') {
				const { entries } = await approveTimeEntries({
					supabase,
					entryIds,
					approverId: user.id,
					orgId: membership.org_id,
				});

				return (
					<QuickApproveLayout
						status='success'
						title='Tidrapporter godkända'
						description={`${entries.length} tidrapporter godkändes. Tack!`}
					/>
				);
			}

			return (
				<MultiEntryReview
					entries={pendingEntries ?? []}
					approveUrl={`/dashboard/approvals/quick-approve?mode=all&userId=${params.userId}&action=approve`}
				/>
			);
		}

		throw new Error('Ogiltig åtgärd. Öppna godkännandesidan för att fortsätta.');
	} catch (error) {
		return (
			<QuickApproveLayout
				status='error'
				title='Kunde inte godkänna'
				description={getErrorMessage(error)}
			/>
		);
	}
}

interface QuickApproveLayoutProps {
	status: 'success' | 'error';
	title: string;
	description: string;
}

function QuickApproveLayout({ status, title, description }: QuickApproveLayoutProps) {
	const isSuccess = status === 'success';

	return (
		<div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16 dark:bg-[#0A0908]'>
			<div className='w-full max-w-lg rounded-2xl border border-border bg-card p-10 shadow-lg'>
				<div className='flex justify-center'>
					{isSuccess ? (
						<CheckCircle2 className='h-16 w-16 text-green-500' />
					) : (
						<XCircle className='h-16 w-16 text-red-500' />
					)}
				</div>

				<h1 className='mt-6 text-center text-2xl font-semibold'>{title}</h1>
				<p className='mt-3 text-center text-muted-foreground'>{description}</p>

				<div className='mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center'>
					<Button asChild>
						<Link href='/dashboard/approvals'>Öppna Godkännanden</Link>
					</Button>
					<Button variant='outline' asChild>
						<Link href='/dashboard'>Till dashboard</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}


interface SingleEntryReviewProps {
	entry: {
		id: string;
		status: string;
		start_at: string | null;
		stop_at: string | null;
		duration_min: number | null;
		notes: string | null;
		project?: { name?: string | null } | null;
		user?: { full_name?: string | null } | null;
	};
	pendingCount: number;
	approveUrl: string;
}

function formatDuration(minutes: number | null | undefined) {
	if (!minutes) return '-';
	const hours = Math.floor(minutes / 60);
	const mins = Math.round(minutes % 60);
	return `${hours}h ${mins}min`;
}

function formatDate(date?: string | null) {
	if (!date) return '-';
	return new Date(date).toLocaleDateString('sv-SE', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function formatTime(date?: string | null) {
	if (!date) return null;
	return new Date(date).toLocaleTimeString('sv-SE', {
		hour: '2-digit',
		minute: '2-digit',
	});
}

function SingleEntryReview({ entry, pendingCount, approveUrl }: SingleEntryReviewProps) {
	const startTime = formatTime(entry.start_at);
	const stopTime = formatTime(entry.stop_at);

	return (
		<div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16 dark:bg-[#0A0908]'>
			<div className='w-full max-w-2xl space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg'>
				<div className='flex items-center gap-3'>
					<ClipboardList className='h-10 w-10 text-orange-500' />
					<div>
						<h1 className='text-2xl font-semibold'>Granska tidrapport</h1>
						<p className='text-sm text-muted-foreground'>
							{entry.user?.full_name ?? 'Okänd användare'} – {formatDate(entry.start_at)}
						</p>
					</div>
				</div>

				<div className='rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/40'>
					<dl className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<div>
							<dt className='text-xs font-semibold uppercase tracking-wide text-orange-600'>Medarbetare</dt>
							<dd className='text-sm'>{entry.user?.full_name ?? 'Okänd användare'}</dd>
						</div>
						<div>
							<dt className='text-xs font-semibold uppercase tracking-wide text-orange-600'>Projekt</dt>
							<dd className='text-sm'>{entry.project?.name ?? 'Okänt projekt'}</dd>
						</div>
						<div>
							<dt className='text-xs font-semibold uppercase tracking-wide text-orange-600'>Checkade in</dt>
							<dd className='text-sm'>{startTime ?? '–'}</dd>
						</div>
						<div>
							<dt className='text-xs font-semibold uppercase tracking-wide text-orange-600'>Checkade ut</dt>
							<dd className='text-sm'>{stopTime ?? '–'}</dd>
						</div>
						<div>
							<dt className='text-xs font-semibold uppercase tracking-wide text-orange-600'>Timmar</dt>
							<dd className='text-sm'>{formatDuration(entry.duration_min)}</dd>
						</div>
						<div>
							<dt className='text-xs font-semibold uppercase tracking-wide text-orange-600'>Status</dt>
							<dd className='text-sm capitalize'>{entry.status}</dd>
						</div>
					</dl>
					{entry.notes && (
						<div className='mt-4 rounded-md border border-orange-200 bg-white/90 p-3 text-sm text-muted-foreground dark:border-orange-900/50 dark:bg-orange-950/20'>
							<strong>Notering:</strong> {entry.notes}
						</div>
					)}
				</div>

				{pendingCount > 1 && (
					<p className='text-sm text-muted-foreground'>
						Det finns totalt {pendingCount} väntande rader för denna medarbetare under vald period.
					</p>
				)}

				<div className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
					<Button variant='outline' asChild>
						<Link href='/dashboard/approvals'>Öppna Godkännanden</Link>
					</Button>
					<Button asChild>
						<Link href={approveUrl}>Godkänn denna tid</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}

interface MultiEntryReviewProps {
	entries: Array<{
		id: string;
		start_at: string | null;
		stop_at: string | null;
		duration_min: number | null;
		project?: { name?: string | null } | null;
	}>;
	approveUrl: string;
}

function MultiEntryReview({ entries, approveUrl }: MultiEntryReviewProps) {
	const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_min ?? 0), 0);

	return (
		<div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16 dark:bg-[#0A0908]'>
			<div className='w-full max-w-3xl space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg'>
				<div className='flex items-center gap-3'>
					<ClipboardList className='h-10 w-10 text-orange-500' />
					<div>
						<h1 className='text-2xl font-semibold'>Granska väntande tidrapporter</h1>
						<p className='text-sm text-muted-foreground'>
							{entries.length} poster väntar på godkännande
						</p>
					</div>
				</div>

				<div className='space-y-3'>
					{entries.slice(0, 10).map((entry) => (
						<div key={entry.id} className='rounded-lg border border-border bg-muted/30 p-4'>
							<div className='flex flex-col gap-1 text-sm'>
								<span className='font-medium'>{formatDate(entry.start_at)}</span>
								<span className='text-muted-foreground'>
									{entry.project?.name ?? 'Okänt projekt'}
								</span>
								<span className='text-muted-foreground'>
									{formatTime(entry.start_at) ?? '–'} – {formatTime(entry.stop_at) ?? '–'} • {formatDuration(entry.duration_min)}
								</span>
							</div>
						</div>
					))}
					{entries.length > 10 && (
						<p className='text-xs text-muted-foreground italic'>
							Visar de 10 första raderna. Totalt {entries.length} väntande poster.
						</p>
					)}
				</div>

				<div className='rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/40'>
					<p className='text-sm font-medium text-orange-900 dark:text-orange-200'>
						Samlad tid att godkänna: {formatDuration(totalMinutes)}
					</p>
				</div>

				<div className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
					<Button variant='outline' asChild>
						<Link href='/dashboard/approvals'>Öppna Godkännanden</Link>
					</Button>
					<Button asChild>
						<Link href={approveUrl}>Godkänn alla väntande rader</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}

