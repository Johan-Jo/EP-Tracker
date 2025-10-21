import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { recordPaymentSchema } from '@/lib/schemas/billing';

/**
 * Get All Payments
 * GET /api/super-admin/billing/payments
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = await createClient();
    
    let query = supabase
      .from('payments')
      .select(`
        *,
        organization:organizations(id, name),
        subscription:subscriptions(id, status)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ payments: data });
  } catch (error) {
    console.error('Error in GET /api/super-admin/billing/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Record Payment
 * POST /api/super-admin/billing/payments
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const body = await request.json();
    const validation = recordPaymentSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Generate invoice number if not provided
    let paymentData = validation.data;
    if (!paymentData.invoice_number) {
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      paymentData = { ...paymentData, invoice_number: invoiceNumber };
    }
    
    const { data: payment, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();
    
    if (error) {
      console.error('Error recording payment:', error);
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      );
    }
    
    // If payment is marked as paid, update subscription status if past_due
    if (payment.status === 'paid' && payment.subscription_id) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('id', payment.subscription_id)
        .single();
      
      if (subscription && subscription.status === 'past_due') {
        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', payment.subscription_id);
      }
    }
    
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/super-admin/billing/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

