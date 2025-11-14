import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface TimeApprovalInviteEmailProps {
  approverName?: string | null;
  workerName: string;
  projectName?: string | null;
  entryDate: string;
  entryHours: string;
  notes?: string | null;
  approveUrl: string;
  approveAllUrl?: string | null;
  pendingCount?: number;
  subjectLine: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  reviewUrl?: string | null;
}

export const TimeApprovalInviteEmail = ({
  approverName,
  workerName,
  projectName,
  entryDate,
  entryHours,
  notes,
  approveUrl,
  approveAllUrl,
  pendingCount,
  subjectLine,
  checkInTime,
  checkOutTime,
  reviewUrl,
}: TimeApprovalInviteEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{subjectLine}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.logo}>EP Tracker</Heading>
          <Heading style={styles.heading}>{subjectLine}</Heading>

          <Text style={styles.paragraph}>
            Hej {approverName || 'team'},
          </Text>

          <Text style={styles.paragraph}>
            {workerName} har registrerat tid som väntar på ditt godkännande.
          </Text>

          <Section style={styles.summaryBox}>
            <Text style={styles.summaryItem}>
              <strong>Medarbetare:</strong> {workerName}
            </Text>
            {projectName && (
              <Text style={styles.summaryItem}>
                <strong>Projekt:</strong> {projectName}
              </Text>
            )}
            <Text style={styles.summaryItem}>
              <strong>Datum:</strong> {entryDate}
            </Text>
            <Text style={styles.summaryItem}>
              <strong>Timmar:</strong> {entryHours}
            </Text>
            {checkInTime && (
              <Text style={styles.summaryItem}>
                <strong>Checkade in:</strong> {checkInTime}
              </Text>
            )}
            {checkOutTime && (
              <Text style={styles.summaryItem}>
                <strong>Checkade ut:</strong> {checkOutTime}
              </Text>
            )}
            {notes && (
              <Text style={styles.summaryItem}>
                <strong>Notering:</strong> {notes}
              </Text>
            )}
          </Section>

          {reviewUrl && (
            <Section style={styles.buttonSection}>
              <Button href={reviewUrl} style={styles.secondaryOutlineButton}>
                Visa tidrapporten före godkännande
              </Button>
            </Section>
          )}

          <Section style={styles.buttonSection}>
            <Button href={approveUrl} style={styles.primaryButton}>
              Godkänn denna tid
            </Button>
          </Section>

          {approveAllUrl && pendingCount && pendingCount > 1 && (
            <Section style={styles.buttonSection}>
              <Button href={approveAllUrl} style={styles.secondaryButton}>
                Godkänn all väntande tid ({pendingCount} rader)
              </Button>
            </Section>
          )}

          <Hr style={styles.divider} />

          <Text style={styles.helperText}>
            Du kan även logga in på EP Tracker för att granska fler detaljer eller göra ändringar.
          </Text>

          <Text style={styles.footer}>
            Tack för att du håller projekten uppdaterade!
            <br />
            EP Tracker
          </Text>

          <Text style={styles.disclaimer}>
            Denna länk går till ett säkert godkännandeflöde. Om du inte känner igen ärendet kan du ignorera mejlet.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default TimeApprovalInviteEmail;

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    margin: 0,
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '24px',
    maxWidth: '520px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
  },
  logo: {
    color: '#ea580c',
    fontSize: '28px',
    fontWeight: 700,
    textAlign: 'center' as const,
    marginBottom: '8px',
  },
  heading: {
    color: '#111827',
    fontSize: '22px',
    fontWeight: 600,
    textAlign: 'center' as const,
    margin: '0 0 24px 0',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#111827',
    margin: '0 0 16px 0',
  },
  summaryBox: {
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    padding: '16px 20px',
    margin: '0 0 24px 0',
  },
  summaryItem: {
    fontSize: '15px',
    lineHeight: '22px',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  buttonSection: {
    textAlign: 'center' as const,
    marginBottom: '16px',
  },
  primaryButton: {
    backgroundColor: '#ea580c',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: 600,
    padding: '14px 24px',
    textDecoration: 'none',
  },
  secondaryButton: {
    backgroundColor: '#f97316',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: 600,
    padding: '12px 22px',
    textDecoration: 'none',
  },
  secondaryOutlineButton: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    color: '#ea580c',
    border: '2px solid #ea580c',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: 600,
    padding: '12px 22px',
    textDecoration: 'none',
  },
  divider: {
    borderColor: '#e5e7eb',
    margin: '32px 0',
  },
  helperText: {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#4b5563',
    margin: '0 0 16px 0',
  },
  footer: {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#4b5563',
    margin: '0 0 12px 0',
  },
  disclaimer: {
    fontSize: '12px',
    lineHeight: '18px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    margin: '0',
  },
};


