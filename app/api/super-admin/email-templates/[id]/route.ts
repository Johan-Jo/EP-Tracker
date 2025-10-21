import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/super-admin/email-templates/[id]
 * 
 * Get a single email template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error fetching email template:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch email template',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/email-templates/[id]
 * 
 * Update an email template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    
    const { id } = await params;
    const body = await request.json();
    const { subject_template, body_template, description, is_active } = body;

    const supabase = await createClient();
    
    // Check if template is system template
    const { data: existing } = await supabase
      .from('email_templates')
      .select('is_system, name')
      .eq('id', id)
      .single();

    if (existing?.is_system) {
      // System templates: Can only update body_template, description and is_active
      // Subject template is locked for system templates
      const { data, error } = await supabase
        .from('email_templates')
        .update({
          body_template,
          description,
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        template: data,
        message: 'System template updated (subject locked)',
      });
    }

    // Non-system templates can update all fields
    const { data, error } = await supabase
      .from('email_templates')
      .update({
        subject_template,
        body_template,
        description,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update email template',
      },
      { status: 500 }
    );
  }
}

