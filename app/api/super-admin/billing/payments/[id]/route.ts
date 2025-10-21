import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { updatePaymentSchema } from '@/lib/schemas/billing';

/**
 * Update Payment Status
 * PATCH /api/super-admin/billing/payments/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
    
    const body = await request.json();
    const validation = updatePaymentSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Get payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Update payment
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(validation.data)
      .eq('id', params.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating payment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }
    
    // If payment is now marked as paid, update subscription status
    if (validation.data.status === 'paid' && payment.subscription_id) {
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
    
    return NextResponse.json({ payment: updatedPayment });
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/billing/payments/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

