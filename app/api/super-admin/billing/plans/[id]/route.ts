import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { updatePricingPlanSchema } from '@/lib/schemas/billing';

/**
 * Update Pricing Plan
 * PATCH /api/super-admin/billing/plans/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
    
    const body = await request.json();
    const validation = updatePricingPlanSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('pricing_plans')
      .update(validation.data)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating pricing plan:', error);
      return NextResponse.json(
        { error: 'Failed to update pricing plan' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ plan: data });
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/billing/plans/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Deactivate Pricing Plan
 * DELETE /api/super-admin/billing/plans/[id]
 * 
 * Soft delete - sets is_active to false
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
    
    const supabase = await createClient();
    
    // Check if any organizations are currently on this plan
    const { count } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', params.id)
      .in('status', ['trial', 'active']);
    
    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot deactivate plan: ${count} organization(s) are currently using it` },
        { status: 400 }
      );
    }
    
    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('pricing_plans')
      .update({ is_active: false })
      .eq('id', params.id);
    
    if (error) {
      console.error('Error deactivating pricing plan:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate pricing plan' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/super-admin/billing/plans/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

