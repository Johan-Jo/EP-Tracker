import { getSession } from '@/lib/auth/get-session';
import { redirect } from 'next/navigation';
import { HelpPageClient } from '@/components/help/help-page-client';

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

    return (
        <div className='p-4 md:p-8 space-y-6'>
            <div>
                <h1 className='text-3xl font-bold tracking-tight'>Hjälp & Support</h1>
                <p className='text-muted-foreground mt-2'>
                    Guider och svar på vanliga frågor
                </p>
            </div>

            <HelpPageClient userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance'} />
        </div>
    );
}

