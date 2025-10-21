import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { calculateMRR, calculateChurnRate } from '@/lib/billing/mrr-calculator';

/**
 * Get MRR Metrics
 * GET /api/super-admin/billing/metrics/mrr
 * 
 * Returns current MRR, paying/trial/canceled counts, ARR, etc.
 */
export async function GET() {
  try {
    await requireSuperAdmin();
    
    const supabase = await createClient();
    
    // Get all active subscriptions with plan details
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:pricing_plans(id, name, price_sek, billing_cycle)
      `);
    
    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }
    
    // Calculate MRR
    const mrrData = calculateMRR(subscriptions || []);
    
    // Calculate churn rate
    const churnData = calculateChurnRate(subscriptions || []);
    
    return NextResponse.json({
      ...mrrData,
      churn_rate: churnData.churn_rate,
      churned_count: churnData.churned_count,
    });
  } catch (error) {
    console.error('Error in GET /api/super-admin/billing/metrics/mrr:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

