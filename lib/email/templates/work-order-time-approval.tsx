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

interface WorkOrderTimeApprovalEmailProps {
  workerName: string;
  workOrderTitle: string;
  workOrderNumber: string;
  projectName?: string | null;
  plannedStart: string;
  plannedEnd: string;
  plannedDuration: string;
  actualStart: string;
  actualEnd: string;
  actualDuration: string;
  timeDifference: string;
  timeDifferenceMinutes: number;
  approveUrl: string;
  adjustUrl: string;
}

export const WorkOrderTimeApprovalEmail = ({
  workerName,
  workOrderTitle,
  workOrderNumber,
  projectName,
  plannedStart,
  plannedEnd,
  plannedDuration,
  actualStart,
  actualEnd,
  actualDuration,
  timeDifference,
  timeDifferenceMinutes,
  approveUrl,
  adjustUrl,
}: WorkOrderTimeApprovalEmailProps) => {
  const isOverTime = timeDifferenceMinutes > 0;
  const isUnderTime = timeDifferenceMinutes < 0;

  return (
    <Html>
      <Head />
      <Preview>Godkänn registrerad tid för {workOrderTitle}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.logo}>EP Tracker</Heading>
          <Heading style={styles.heading}>Godkänn registrerad tid</Heading>

          <Text style={styles.paragraph}>
            Hej {workerName},
          </Text>

          <Text style={styles.paragraph}>
            Du har registrerat tid för arbetsordern <strong>{workOrderTitle}</strong> ({workOrderNumber}).
            Vänligen granska och godkänn den registrerade tiden nedan.
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
          </Section>

          <Section style={styles.timeComparisonBox}>
            <Text style={styles.comparisonTitle}>Tidsjämförelse</Text>
            
            <Section style={styles.timeRow}>
              <Text style={styles.timeLabel}>Planerad tid:</Text>
              <Text style={styles.timeValue}>
                {plannedStart} - {plannedEnd}
              </Text>
              <Text style={styles.durationValue}>({plannedDuration})</Text>
            </Section>

            <Section style={styles.timeRow}>
              <Text style={styles.timeLabel}>Registrerad tid:</Text>
              <Text style={styles.timeValue}>
                {actualStart} - {actualEnd}
              </Text>
              <Text style={styles.durationValue}>({actualDuration})</Text>
            </Section>

            <Hr style={styles.comparisonDivider} />

            <Section style={styles.differenceRow}>
              <Text style={styles.differenceLabel}>Avvikelse:</Text>
              <Text style={[
                styles.differenceValue,
                isOverTime ? styles.overTime : isUnderTime ? styles.underTime : styles.exactTime
              ]}>
                {timeDifference}
              </Text>
            </Section>
          </Section>

          <Section style={styles.buttonSection}>
            <Button href={approveUrl} style={styles.primaryButton}>
              ✓ Godkänn registrerad tid
            </Button>
          </Section>

          <Section style={styles.buttonSection}>
            <Button href={adjustUrl} style={styles.secondaryButton}>
              ✏️ Justera tid
            </Button>
          </Section>

          <Hr style={styles.divider} />

          <Text style={styles.helperText}>
            Om den registrerade tiden stämmer, klicka på "Godkänn". Om det finns en avvikelse som behöver justeras, klicka på "Justera tid" för att uppdatera.
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

export default WorkOrderTimeApprovalEmail;

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
  timeComparisonBox: {
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    padding: '16px 20px',
    margin: '0 0 24px 0',
  },
  comparisonTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  timeRow: {
    marginBottom: '12px',
  },
  timeLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#4b5563',
    margin: '0 0 4px 0',
  },
  timeValue: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 2px 0',
  },
  durationValue: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 0 0',
  },
  comparisonDivider: {
    borderColor: '#e5e7eb',
    margin: '16px 0',
  },
  differenceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
  },
  differenceLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  differenceValue: {
    fontSize: '16px',
    fontWeight: 700,
  },
  overTime: {
    color: '#dc2626', // Red for overtime
  },
  underTime: {
    color: '#059669', // Green for undertime
  },
  exactTime: {
    color: '#111827', // Black for exact match
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

