import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { assignPlanSchema } from '@/lib/schemas/billing';
import { calculateTrialEndDate, calculateNextPeriod } from '@/lib/billing/subscriptions';

/**
 * Get All Subscriptions
 * GET /api/super-admin/billing/subscriptions
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const supabase = await createClient();
    
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        organization:organizations(id, name),
        plan:pricing_plans(id, name, price_sek, billing_cycle, max_users, max_storage_gb)
      `)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ subscriptions: data });
  } catch (error) {
    console.error('Error in GET /api/super-admin/billing/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Assign Plan to Organization
 * POST /api/super-admin/billing/subscriptions
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const body = await request.json();
    const validation = assignPlanSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { organization_id, plan_id, start_trial, trial_days } = validation.data;
    
    const supabase = await createClient();
    
    // Check if organization already has a subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('organization_id', organization_id)
      .maybeSingle();
    
    if (existing) {
      return NextResponse.json(
        { error: 'Organization already has a subscription. Use PATCH to change plan.' },
        { status: 400 }
      );
    }
    
    // Get plan details to determine billing cycle
    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('billing_cycle')
      .eq('id', plan_id)
      .single();
    
    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }
    
    // Calculate billing period
    const { period_start, period_end } = calculateNextPeriod(plan.billing_cycle);
    
    // Create subscription
    const subscriptionData = {
      organization_id,
      plan_id,
      status: start_trial ? 'trial' : 'active',
      trial_ends_at: start_trial ? calculateTrialEndDate(trial_days || 14) : null,
      current_period_start: period_start,
      current_period_end: period_end,
    };
    
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
    
    if (subError) {
      console.error('Error creating subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }
    
    // Update organization with plan_id and status
    await supabase
      .from('organizations')
      .update({
        plan_id,
        status: start_trial ? 'trial' : 'active',
        trial_ends_at: start_trial ? calculateTrialEndDate(trial_days || 14) : null,
      })
      .eq('id', organization_id);
    
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/super-admin/billing/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

