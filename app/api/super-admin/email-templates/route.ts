import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/super-admin/email-templates
 * 
 * Get all email templates
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const supabase = await createClient();
    
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch email templates',
      },
      { status: 500 }
    );
  }
}

