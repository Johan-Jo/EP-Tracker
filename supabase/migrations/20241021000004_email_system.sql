-- ============================================================================
-- Email System Schema
-- Creates tables for email logging, templates, and sending history
-- ============================================================================

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient info
  to_email TEXT NOT NULL,
  to_name TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Email details
  subject TEXT NOT NULL,
  template_name TEXT,
  template_data JSONB,
  
  -- Sending details
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  
  -- Status tracking
  status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')) DEFAULT 'pending',
  provider_id TEXT, -- Resend message ID
  provider_response JSONB,
  error_message TEXT,
  
  -- Metadata
  email_type TEXT CHECK (email_type IN ('announcement', 'notification', 'transactional', 'marketing')),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template info
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  subject_template TEXT NOT NULL,
  body_template TEXT, -- HTML/Markdown content for custom templates
  
  -- Template type
  template_type TEXT CHECK (template_type IN ('announcement', 'notification', 'transactional', 'marketing')),
  
  -- Template variables (for documentation)
  variables JSONB, -- e.g., ["organizationName", "trialEndsAt", "supportEmail"]
  
  -- Flags
  is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_email_logs_organization ON email_logs(organization_id);
CREATE INDEX idx_email_logs_sent_by ON email_logs(sent_by);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);

CREATE INDEX idx_email_templates_name ON email_templates(name);
CREATE INDEX idx_email_templates_type ON email_templates(template_type);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Super admin policies for email_logs
CREATE POLICY "Super admins can view all email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can update email logs"
  ON email_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
    )
  );

-- Super admin policies for email_templates
CREATE POLICY "Super admins can view all email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can update non-system email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
    )
    AND is_system = false
  );

CREATE POLICY "Super admins can delete non-system email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
    )
    AND is_system = false
  );

-- Seed default email templates
INSERT INTO email_templates (name, description, subject_template, template_type, variables, is_system, is_active)
VALUES
  (
    'trial-ending-reminder',
    'Sent 3 days before trial ends',
    'Your EP Tracker trial ends in {{daysRemaining}} days',
    'notification',
    '["organizationName", "daysRemaining", "trialEndsAt", "upgradeUrl", "supportEmail"]'::jsonb,
    true,
    true
  ),
  (
    'trial-ended',
    'Sent when trial period ends',
    'Your EP Tracker trial has ended',
    'notification',
    '["organizationName", "upgradeUrl", "supportEmail"]'::jsonb,
    true,
    true
  ),
  (
    'payment-failed',
    'Sent when payment fails',
    'Payment failed for your EP Tracker subscription',
    'notification',
    '["organizationName", "planName", "amount", "retryDate", "updatePaymentUrl", "supportEmail"]'::jsonb,
    true,
    true
  ),
  (
    'payment-successful',
    'Sent when payment succeeds',
    'Payment received - Thank you!',
    'transactional',
    '["organizationName", "planName", "amount", "invoiceUrl", "nextBillingDate"]'::jsonb,
    true,
    true
  ),
  (
    'account-suspended',
    'Sent when account is suspended',
    'Your EP Tracker account has been suspended',
    'notification',
    '["organizationName", "reason", "contactUrl", "supportEmail"]'::jsonb,
    true,
    true
  ),
  (
    'announcement',
    'General announcement template',
    '{{subject}}',
    'announcement',
    '["subject", "message", "ctaText", "ctaUrl"]'::jsonb,
    false,
    true
  ),
  (
    'password-reset',
    'Password reset email',
    'Reset your EP Tracker password',
    'transactional',
    '["userName", "resetUrl", "expiresIn"]'::jsonb,
    true,
    true
  ),
  (
    'welcome',
    'Welcome email for new users',
    'Welcome to EP Tracker!',
    'transactional',
    '["userName", "organizationName", "dashboardUrl", "supportEmail"]'::jsonb,
    true,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- Comments
COMMENT ON TABLE email_logs IS 'Tracks all emails sent from the platform';
COMMENT ON TABLE email_templates IS 'Email template definitions for system and custom emails';
COMMENT ON COLUMN email_logs.status IS 'pending: queued, sent: sent to provider, delivered: confirmed delivery, failed: send failed, bounced: recipient bounced';
COMMENT ON COLUMN email_logs.email_type IS 'announcement: bulk emails, notification: system alerts, transactional: user-triggered, marketing: promotional';
COMMENT ON COLUMN email_templates.is_system IS 'System templates cannot be deleted or have certain fields modified';

