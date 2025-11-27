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

interface WorkOrderAssignmentEmailProps {
  workerName: string;
  workOrderTitle: string;
  workOrderNumber: string;
  projectName?: string | null;
  customerName?: string | null;
  addressLine?: string | null;
  mapImageUrl?: string | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  workOrderUrl: string;
  timeEntryUrl: string;
  todayWorkOrdersUrl: string;
}

export const WorkOrderAssignmentEmail = ({
  workerName,
  workOrderTitle,
  workOrderNumber,
  projectName,
  customerName,
  addressLine,
  mapImageUrl,
  plannedStart,
  plannedEnd,
  workOrderUrl,
  timeEntryUrl,
  todayWorkOrdersUrl,
}: WorkOrderAssignmentEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Ny arbetsorder: {workOrderTitle}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.logo}>EP Tracker</Heading>
          <Heading style={styles.heading}>Ny arbetsorder tilldelad</Heading>

          <Text style={styles.paragraph}>Hej {workerName},</Text>

          <Text style={styles.paragraph}>
            Du har fått en ny arbetsorder <strong>{workOrderTitle}</strong> ({workOrderNumber}). Nedan ser du en
            sammanfattning av uppdraget.
          </Text>

          <Section style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Arbetsorder</Text>
            <Text style={styles.summaryItem}>
              <strong>Titel:</strong> {workOrderTitle}
            </Text>
            <Text style={styles.summaryItem}>
              <strong>Nummer:</strong> {workOrderNumber}
            </Text>
            {projectName && (
              <Text style={styles.summaryItem}>
                <strong>Projekt:</strong> {projectName}
              </Text>
            )}
            {customerName && (
              <Text style={styles.summaryItem}>
                <strong>Kund:</strong> {customerName}
              </Text>
            )}
            {addressLine && (
              <Text style={styles.summaryItem}>
                <strong>Plats:</strong> {addressLine}
              </Text>
            )}
            {plannedStart && plannedEnd && (
              <Text style={styles.summaryItem}>
                <strong>Planerad tid:</strong> {plannedStart} – {plannedEnd}
              </Text>
            )}
          </Section>

          <Section style={styles.buttonSection}>
            <Button href={workOrderUrl} style={styles.primaryButton}>
              Öppna arbetsorder
            </Button>
          </Section>

          {mapImageUrl && (
            <Section style={{ marginTop: '16px', textAlign: 'center' as const }}>
              <img
                src={mapImageUrl}
                alt={addressLine || 'Arbetsplats'}
                style={{ maxWidth: '100%', borderRadius: '12px' }}
              />
            </Section>
          )}

          <Section style={styles.buttonSection}>
            <Button href={timeEntryUrl} style={styles.secondaryButton}>
              Registrera tid för denna arbetsorder
            </Button>
          </Section>

          <Section style={styles.buttonSection}>
            <Button href={todayWorkOrdersUrl} style={styles.secondaryButton}>
              Visa dagens arbeten
            </Button>
          </Section>

          <Hr style={styles.divider} />

          <Text style={styles.helperText}>
            När du har utfört arbetet registrerar du din faktiska tid via knappen &quot;Registrera tid&quot; ovan. Tiden
            kopplas automatiskt till arbetsordern i EP Tracker.
          </Text>

          <Text style={styles.footer}>
            Tack för att du håller projekten uppdaterade!
            <br />
            EP Tracker
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WorkOrderAssignmentEmail;

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
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '16px 20px',
    margin: '0 0 16px 0',
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 12px 0',
  },
  summaryItem: {
    fontSize: '15px',
    lineHeight: '22px',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  buttonSection: {
    textAlign: 'center' as const,
    marginTop: '16px',
  },
  primaryButton: {
    backgroundColor: '#ea580c',
    borderRadius: '9999px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    padding: '12px 24px',
    textDecoration: 'none',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: '9999px',
    border: '1px solid #e5e7eb',
    color: '#111827',
    fontSize: '15px',
    fontWeight: 500,
    padding: '10px 22px',
    textDecoration: 'none',
  },
  divider: {
    borderColor: '#e5e7eb',
    margin: '24px 0 16px 0',
  },
  helperText: {
    fontSize: '14px',
    lineHeight: '22px',
    color: '#4b5563',
    margin: '0 0 16px 0',
  },
  footer: {
    fontSize: '13px',
    lineHeight: '20px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginTop: '8px',
  },
};


