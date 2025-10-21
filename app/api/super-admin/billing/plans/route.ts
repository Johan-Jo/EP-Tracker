import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { createPricingPlanSchema } from '@/lib/schemas/billing';

/**
 * Get All Pricing Plans
 * GET /api/super-admin/billing/plans
 */
export async function GET() {
  try {
    await requireSuperAdmin();
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('billing_cycle', { ascending: true })
      .order('price_sek', { ascending: true });
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch pricing plans' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ plans: data });
  } catch (error) {
    console.error('Error in GET /api/super-admin/billing/plans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create Pricing Plan
 * POST /api/super-admin/billing/plans
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const body = await request.json();
    const validation = createPricingPlanSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('pricing_plans')
      .insert(validation.data)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pricing plan:', error);
      return NextResponse.json(
        { error: 'Failed to create pricing plan' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ plan: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/super-admin/billing/plans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

