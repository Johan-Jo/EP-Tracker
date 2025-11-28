import { getSession } from '@/lib/auth/get-session';
import { redirect } from 'next/navigation';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import { HelpPageNew } from '@/components/help/help-page-new';

export default async function HelpPage() {
    // Check if we're in demo mode
    const inDemoMode = await isDemoRoute();
    
    const { user, membership } = await getSession();

    // Skip auth redirect if in demo mode
    if (!inDemoMode && !user) {
        redirect('/sign-in');
    }

    if (!membership) {
        return (
            <div className='p-4 md:p-8'>
                <p className='text-destructive'>Ingen aktiv organisation hittades</p>
            </div>
        );
    }

    return <HelpPageNew userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance' | 'ue'} />;
}

