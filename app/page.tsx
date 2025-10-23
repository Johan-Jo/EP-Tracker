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
  const { data: { user } } = await supabase.auth.getUser();

  // If authenticated, check onboarding status
  if (user) {
    // Check if user has an organization membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('id, role, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) {
      // No membership - user needs to complete organization setup
      redirect('/complete-setup');
    }

    // Check if this is their first login (created within last 5 minutes)
    const createdAt = new Date(membership.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    
    if (minutesSinceCreation < 5) {
      // Recently created membership - show welcome page
      redirect('/welcome');
    }

    // Existing user - go to dashboard
    redirect('/dashboard');
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingFAQ />
      <LandingFooter />
    </div>
  );
}
