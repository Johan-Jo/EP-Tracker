import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingPricing } from '@/components/landing/landing-pricing';
import { LandingFAQ } from '@/components/landing/landing-faq';
import { LandingFooter } from '@/components/landing/landing-footer';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const code = params.code as string | undefined;
  const error = params.error as string | undefined;
  const errorCode = params.error_code as string | undefined;
  const errorDescription = params.error_description as string | undefined;

  // If there's an auth code, redirect to callback to exchange it for a session
  if (code) {
    console.log('[Landing] Auth code detected, redirecting to callback');
    // Preserve the code and any other params
    const callbackUrl = new URL('/api/auth/callback', 'https://eptracker.app');
    callbackUrl.searchParams.set('code', code);
    redirect(callbackUrl.toString());
  }

  // If there's an auth error from magic link, redirect to sign-in with error
  if (error && errorCode) {
    console.error('[Landing] Auth error detected:', { error, errorCode, errorDescription });
    
    // Handle magic link errors
    if (errorCode === 'otp_expired') {
      redirect(`/sign-in?error=link_expired&message=${encodeURIComponent('Inloggningslänken har gått ut eller redan använts. Begär en ny länk.')}`);
    }
    
    // Generic auth errors
    redirect(`/sign-in?error=auth_error&message=${encodeURIComponent(errorDescription || error)}`);
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // If authenticated, check onboarding status
  if (user && !authError) {
    // Check if user has an organization membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id, role, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // If RLS error or auth error, log out the user (stale/invalid session)
    if (membershipError && membershipError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected when no membership)
      // Any other error means RLS issue or invalid session
      console.error('[Root] Membership query error:', membershipError);
      redirect('/sign-in');
    }

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
