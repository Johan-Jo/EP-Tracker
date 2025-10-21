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

interface PaymentFailedEmailProps {
  organizationName: string;
  planName?: string;
  amount?: string;
  updatePaymentUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const PaymentFailedEmail = ({
  organizationName,
  planName = 'Pro',
  amount = '299',
  updatePaymentUrl = `${baseUrl}/dashboard/settings/billing`,
}: PaymentFailedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Problem med din betalning för EP Tracker</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>EP Tracker</Heading>
          <Heading style={h2}>⚠️ Betalningsproblem</Heading>
          
          <Text style={greeting}>Hej {organizationName}!</Text>
          
          <Text style={text}>
            Vi kunde tyvärr inte genomföra din senaste betalning för EP Tracker ({planName}-planen, {amount} kr).
          </Text>
          
          <Text style={text}>
            <strong>Vanliga orsaker:</strong>
          </Text>
          
          <Text style={listItem}>• Utgånget kort</Text>
          <Text style={listItem}>• Otillräckliga medel</Text>
          <Text style={listItem}>• Kortet är blockerat av banken</Text>
          <Text style={listItem}>• Fel kortuppgifter</Text>
          
          <Text style={text}>
            För att undvika avbrott i din tjänst behöver du uppdatera dina betalningsuppgifter så snart som möjligt.
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={updatePaymentUrl}>
              Uppdatera betalningsuppgifter
            </Button>
          </Section>
          
          <Text style={warningBox}>
            <strong>⚠️ Viktigt:</strong> Om betalningen inte kan genomföras inom 7 dagar kan ditt konto komma att pausas.
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

export default PaymentFailedEmail;

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
  color: '#dc2626',
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

const listItem = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  padding: '0 20px 0 40px',
  margin: '4px 0',
};

const buttonContainer = {
  padding: '27px 0 27px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '250px',
  padding: '14px 20px',
  margin: '0 auto',
};

const warningBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '16px 20px',
  margin: '24px 20px',
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
