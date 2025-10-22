import { getSession } from '@/lib/auth/get-session';
import { redirect } from 'next/navigation';
import { HelpPageNew } from '@/components/help/help-page-new';

export default async function HelpPage() {
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

    return <HelpPageNew userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance'} />;
}

