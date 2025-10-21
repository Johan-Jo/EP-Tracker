import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { changePlanSchema } from '@/lib/schemas/billing';
import { calculateNextPeriod } from '@/lib/billing/subscriptions';

/**
 * Change Subscription Plan
 * PATCH /api/super-admin/billing/subscriptions/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
    
    const body = await request.json();
    const validation = changePlanSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { new_plan_id, immediate } = validation.data;
    
    const supabase = await createClient();
    
    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, plan:pricing_plans(billing_cycle)')
      .eq('id', params.id)
      .single();
    
    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    // Get new plan details
    const { data: newPlan, error: planError } = await supabase
      .from('pricing_plans')
      .select('billing_cycle')
      .eq('id', new_plan_id)
      .single();
    
    if (planError || !newPlan) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }
    
    let updateData: any = { plan_id: new_plan_id };
    
    if (immediate) {
      // Change immediately - reset billing period
      const { period_start, period_end } = calculateNextPeriod(newPlan.billing_cycle);
      updateData = {
        ...updateData,
        current_period_start: period_start,
        current_period_end: period_end,
      };
    }
    
    // Update subscription
    const { data: updatedSub, error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }
    
    // Update organization
    await supabase
      .from('organizations')
      .update({ plan_id: new_plan_id })
      .eq('id', subscription.organization_id);
    
    return NextResponse.json({ subscription: updatedSub });
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/billing/subscriptions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

