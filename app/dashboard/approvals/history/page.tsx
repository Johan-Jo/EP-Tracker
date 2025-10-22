import { getSession } from '@/lib/auth/get-session';
import { redirect } from 'next/navigation';
import { ExportsHistory } from '@/components/approvals/exports-history';

export default async function ApprovalsHistoryPage() {
    const { user, membership } = await getSession();

    if (!user) {
        redirect('/sign-in');
    }

    if (!membership) {
        return (
            <div className='p-4 md:p-8'>
                <p className='text-destructive'>Ingen aktiv organisation hittades</p>
            </div>
        );
    }

    // Only admin and foreman can view history
    if (membership.role !== 'admin' && membership.role !== 'foreman') {
        redirect('/dashboard');
    }

    return (
        <div className='p-4 md:p-8 space-y-6'>
            <div>
                <h1 className='text-3xl font-bold tracking-tight'>Exporthistorik</h1>
                <p className='text-muted-foreground mt-2'>
                    Historik över genererade CSV-filer och exporter
                </p>
            </div>

            <ExportsHistory orgId={membership.org_id} />
        </div>
    );
}

