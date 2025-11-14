import { render } from '@react-email/render';
import { resend, FROM_EMAIL, REPLY_TO_EMAIL } from './client';
import { createAdminClient } from '@/lib/supabase/server';
import { AnnouncementEmail } from './templates/announcement';
import { TrialEndingEmail } from './templates/trial-ending';
import { PaymentFailedEmail } from './templates/payment-failed';
import { PaymentSuccessfulEmail } from './templates/payment-successful';
import { TimeApprovalInviteEmail } from './templates/time-approval-invite';
import { AccountSuspendedEmail } from './templates/account-suspended';
import { WelcomeEmail } from './templates/welcome';
import { PasswordResetEmail } from './templates/password-reset';

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  template: 'announcement' | 'trial-ending' | 'payment-failed' | 'payment-successful' | 'account-suspended' | 'welcome' | 'password-reset' | 'time-approval-invite' | 'custom';
  templateData: Record<string, any>;
  organizationId?: string;
  emailType?: 'announcement' | 'notification' | 'transactional' | 'marketing';
  sentBy?: string;
  replyTo?: string;
}

/**
 * Send an email using Resend and log it to the database
 */
export async function sendEmail(options: SendEmailOptions) {
  const {
    to,
    toName,
    subject,
    template,
    templateData,
    organizationId,
    emailType = 'notification',
    sentBy,
    replyTo = REPLY_TO_EMAIL,
  } = options;

  const adminClient = createAdminClient();
  
  try {
    // Render the email template
    let html: string;
    
    switch (template) {
      case 'announcement':
        html = await render(AnnouncementEmail(templateData as any));
        break;
      case 'trial-ending':
        html = await render(TrialEndingEmail(templateData as any));
        break;
      case 'payment-failed':
        html = await render(PaymentFailedEmail(templateData as any));
        break;
      case 'payment-successful':
        html = await render(PaymentSuccessfulEmail(templateData as any));
        break;
      case 'account-suspended':
        html = await render(AccountSuspendedEmail(templateData as any));
        break;
      case 'time-approval-invite':
        html = await render(TimeApprovalInviteEmail(templateData as any));
        break;
      case 'welcome':
        html = await render(WelcomeEmail(templateData as any));
        break;
      case 'password-reset':
        html = await render(PasswordResetEmail(templateData as any));
        break;
      case 'custom':
        html = templateData.html;
        break;
      default:
        throw new Error(`Unknown template: ${template}`);
    }

    // Check if API key is actually set (not just placeholder)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 're_placeholder_key') {
      const errorMsg = 'RESEND_API_KEY is not set or is placeholder';
      console.error(`❌ [sendEmail] ${errorMsg}`);
      
      // Log failed email
      await adminClient.from('email_logs').insert({
        to_email: to,
        to_name: toName,
        organization_id: organizationId,
        subject,
        template_name: template,
        template_data: templateData,
        sent_by: sentBy,
        status: 'failed',
        error_message: errorMsg,
        email_type: emailType,
      });

      return { success: false, error: errorMsg };
    }

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toName ? `${toName} <${to}>` : to,
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error(`❌ [sendEmail] Resend error:`, error);
      // Log failed email
      await adminClient.from('email_logs').insert({
        to_email: to,
        to_name: toName,
        organization_id: organizationId,
        subject,
        template_name: template,
        template_data: templateData,
        sent_by: sentBy,
        status: 'failed',
        error_message: error.message,
        email_type: emailType,
      });

      throw new Error(`Failed to send email: ${error.message}`);
    }

    // Log successful email
    await adminClient.from('email_logs').insert({
      to_email: to,
      to_name: toName,
      organization_id: organizationId,
      subject,
      template_name: template,
      template_data: templateData,
      sent_by: sentBy,
      status: 'sent',
      provider_id: data?.id,
      provider_response: data,
      email_type: emailType,
    });

    console.log(`✅ Email sent to ${to}: ${subject}`);
    
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    
    // Log error
    await adminClient.from('email_logs').insert({
      to_email: to,
      to_name: toName,
      organization_id: organizationId,
      subject,
      template_name: template,
      template_data: templateData,
      sent_by: sentBy,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      email_type: emailType,
    });

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send announcement to multiple organizations
 */
export async function sendBulkAnnouncement(
  organizationIds: string[],
  subject: string,
  message: string,
  ctaText?: string,
  ctaUrl?: string,
  sentBy?: string
) {
  const adminClient = createAdminClient();
  
  // Get organization details
  const { data: orgs, error } = await adminClient
    .from('organizations')
    .select('id, name')
    .in('id', organizationIds);

  if (error || !orgs) {
    throw new Error('Failed to fetch organizations');
  }

  // Get primary contact email for each organization
  const results = [];
  
  for (const org of orgs) {
    // Get first admin/owner user's email
    const { data: members } = await adminClient
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', org.id)
      .eq('role', 'admin')
      .limit(1);

    if (!members || members.length === 0) continue;

    const { data: { user } } = await adminClient.auth.admin.getUserById(members[0].user_id);
    
    if (!user?.email) continue;

    // Send email
    const result = await sendEmail({
      to: user.email,
      toName: org.name,
      subject,
      template: 'announcement',
      templateData: {
        organizationName: org.name,
        subject,
        message,
        ctaText,
        ctaUrl,
      },
      organizationId: org.id,
      emailType: 'announcement',
      sentBy,
    });

    results.push({ organizationId: org.id, organizationName: org.name, ...result });
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`📧 Bulk announcement sent: ${successful} successful, ${failed} failed`);

  return { successful, failed, results };
}

/**
 * Send trial ending reminder to an organization
 */
export async function sendTrialEndingReminder(
  organizationId: string,
  daysRemaining: number
) {
  const adminClient = createAdminClient();
  
  const { data: org } = await adminClient
    .from('organizations')
    .select('id, name, trial_ends_at')
    .eq('id', organizationId)
    .single();

  if (!org) {
    throw new Error('Organization not found');
  }

  // Get admin email
  const { data: members } = await adminClient
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'admin')
    .limit(1);

  if (!members || members.length === 0) {
    throw new Error('No admin found for organization');
  }

  const { data: { user } } = await adminClient.auth.admin.getUserById(members[0].user_id);
  
  if (!user?.email) {
    throw new Error('Admin email not found');
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return sendEmail({
    to: user.email,
    toName: org.name,
    subject: `Din provperiod slutar om ${daysRemaining} dagar`,
    template: 'trial-ending',
    templateData: {
      organizationName: org.name,
      daysRemaining,
      trialEndsAt: org.trial_ends_at,
      upgradeUrl: `${baseUrl}/dashboard/settings/billing`,
      supportEmail: 'support@eptracker.app',
    },
    organizationId,
    emailType: 'notification',
  });
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedNotification(
  organizationId: string,
  planName: string,
  amount: number,
  retryDate: string
) {
  const adminClient = createAdminClient();
  
  const { data: org } = await adminClient
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .single();

  if (!org) {
    throw new Error('Organization not found');
  }

  // Get admin email
  const { data: members } = await adminClient
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'admin')
    .limit(1);

  if (!members || members.length === 0) {
    throw new Error('No admin found for organization');
  }

  const { data: { user } } = await adminClient.auth.admin.getUserById(members[0].user_id);
  
  if (!user?.email) {
    throw new Error('Admin email not found');
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return sendEmail({
    to: user.email,
    toName: org.name,
    subject: 'Betalning misslyckades - Uppdatera ditt betalsätt',
    template: 'payment-failed',
    templateData: {
      organizationName: org.name,
      planName,
      amount: `${amount}`,
      retryDate,
      updatePaymentUrl: `${baseUrl}/dashboard/settings/billing`,
      supportEmail: 'support@eptracker.app',
    },
    organizationId,
    emailType: 'notification',
  });
}

interface TimeApprovalInviteOptions {
  to: string;
  toName?: string | null;
  organizationId: string;
  workerName: string;
  projectName?: string | null;
  entryDate: string;
  entryHours: string;
  notes?: string | null;
  approveUrl: string;
  approveAllUrl?: string | null;
  pendingCount?: number;
  sentBy?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  subject?: string;
  reviewUrl?: string | null;
}

/**
 * Send an approval invitation to an admin/foreman with quick action links
 */
export async function sendTimeApprovalInvite(options: TimeApprovalInviteOptions) {
  const trimmedName = options.workerName.trim();
  const workerSubjectName = trimmedName.endsWith('s') ? `${trimmedName}’` : `${trimmedName}s`;
  const subject =
    options.subject ?? `${workerSubjectName} tidrapport behöver ditt godkännande`;

  return sendEmail({
    to: options.to,
    toName: options.toName ?? undefined,
    subject,
    template: 'time-approval-invite',
    templateData: {
      approverName: options.toName,
      workerName: options.workerName,
      projectName: options.projectName,
      entryDate: options.entryDate,
      entryHours: options.entryHours,
      notes: options.notes,
      approveUrl: options.approveUrl,
      approveAllUrl: options.approveAllUrl,
      pendingCount: options.pendingCount,
      subjectLine: subject,
      checkInTime: options.checkInTime,
      checkOutTime: options.checkOutTime,
      reviewUrl: options.reviewUrl,
    },
    organizationId: options.organizationId,
    emailType: 'notification',
    sentBy: options.sentBy,
  });
}


