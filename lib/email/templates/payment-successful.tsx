import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface PaymentSuccessfulEmailProps {
  organizationName: string;
  planName: string;
  amount: string;
  nextBillingDate: string;
  invoiceUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const PaymentSuccessfulEmail = ({
  organizationName,
  planName,
  amount,
  nextBillingDate,
  invoiceUrl = `${baseUrl}/dashboard/settings/billing`,
}: PaymentSuccessfulEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Tack för din betalning till EP Tracker!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>EP Tracker</Heading>
          <Heading style={h2}>✓ Betalning mottagen</Heading>
          
          <Text style={greeting}>Hej {organizationName}!</Text>
          
          <Text style={text}>
            Tack för din betalning! Vi har tagit emot din betalning för EP Tracker och din prenumeration är nu aktiv.
          </Text>
          
          <Section style={receiptBox}>
            <Text style={receiptHeading}>
              <strong>Kvitto</strong>
            </Text>
            <div style={receiptRow}>
              <Text style={receiptLabel}>Plan:</Text>
              <Text style={receiptValue}>{planName}</Text>
            </div>
            <div style={receiptRow}>
              <Text style={receiptLabel}>Belopp:</Text>
              <Text style={receiptValue}>{amount} kr</Text>
            </div>
            <div style={receiptRow}>
              <Text style={receiptLabel}>Nästa faktura:</Text>
              <Text style={receiptValue}>{nextBillingDate}</Text>
            </div>
          </Section>
          
          {invoiceUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={invoiceUrl}>
                Visa faktura
              </Button>
            </Section>
          )}
          
          <Text style={text}>
            Din faktura finns också tillgänglig i din instrumentpanel under Inställningar → Fakturering.
          </Text>
          
          <Text style={footer}>
            Har du frågor? Kontakta oss gärna på support@eptracker.se
          </Text>
          
          <Text style={footerSmall}>
            Med vänliga hälsningar,
            <br />
            EP Tracker-teamet
          </Text>
          
          <Text style={footerSmall}>
            © {new Date().getFullYear()} EP Tracker. Alla rättigheter förbehållna.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentSuccessfulEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#ea580c',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#16a34a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0 20px',
  padding: '0 20px',
  textAlign: 'center' as const,
};

const greeting = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 20px',
  margin: '24px 0 12px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 20px',
  margin: '12px 0',
};

const receiptBox = {
  backgroundColor: '#f9fafb',
  border: '2px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 20px',
};

const receiptHeading = {
  color: '#111827',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const receiptRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #e5e7eb',
};

const receiptLabel = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const receiptValue = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: 'bold',
  lineHeight: '20px',
  margin: '0',
};

const buttonContainer = {
  padding: '27px 0 27px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#ea580c',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '14px 20px',
  margin: '0 auto',
};

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 20px',
  margin: '32px 0 12px',
};

const footerSmall = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 20px',
  margin: '12px 0',
  textAlign: 'center' as const,
};

