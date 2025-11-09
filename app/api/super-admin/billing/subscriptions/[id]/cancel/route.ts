import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { cancelSubscriptionSchema } from '@/lib/schemas/billing';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

/**
 * Cancel Subscription
 * POST /api/super-admin/billing/subscriptions/[id]/cancel
 */
type RouteParams = { id: string };

export async function POST(
	request: NextRequest,
	context: RouteContext<RouteParams>
) {
  try {
    await requireSuperAdmin();
    const { id } = await resolveRouteParams(context);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Subscription id is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const validation = cancelSubscriptionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { immediate, reason } = validation.data;
    
    const supabase = await createClient();
    
    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    const updateData: any = {
      canceled_at: new Date().toISOString(),
    };
    
    if (immediate) {
      // Cancel immediately
      updateData.status = 'canceled';
    } else {
      // Cancel at period end
      updateData.cancel_at_period_end = true;
    }
    
    // Update subscription
    const { data: updatedSub, error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error canceling subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }
    
    // Log cancellation in subscription_history
    await supabase
      .from('subscription_history')
      .insert({
        subscription_id: id,
        action: immediate ? 'canceled_immediately' : 'scheduled_cancellation',
        notes: reason || null,
      });
    
    // If immediate, update organization status
    if (immediate) {
      await supabase
        .from('organizations')
        .update({ status: 'suspended' })
        .eq('id', subscription.organization_id);
    }
    
    return NextResponse.json({ 
      subscription: updatedSub,
      message: immediate 
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of the billing period'
    });
  } catch (error) {
    console.error('Error in POST /api/super-admin/billing/subscriptions/[id]/cancel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

