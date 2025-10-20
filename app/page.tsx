import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingPricing } from '@/components/landing/landing-pricing';
import { LandingFAQ } from '@/components/landing/landing-faq';
import { LandingFooter } from '@/components/landing/landing-footer';

export default async function Home() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Redirect authenticated users to dashboard
    if (user) {
        redirect('/dashboard');
    }

    // Show landing page for visitors
    return (
        <div className="min-h-screen bg-white">
            <LandingNav />
            <main>
                <LandingHero />
                <LandingFeatures />
                <LandingPricing />
                <LandingFAQ />
            </main>
            <LandingFooter />
        </div>
    );
}
