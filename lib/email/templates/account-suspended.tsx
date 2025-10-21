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

interface AccountSuspendedEmailProps {
  organizationName: string;
  reason?: string;
  contactUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const AccountSuspendedEmail = ({
  organizationName,
  reason = 'Misslyckad betalning',
  contactUrl = `${baseUrl}/dashboard/settings/billing`,
}: AccountSuspendedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Ditt EP Tracker-konto har pausats</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>EP Tracker</Heading>
          <Heading style={h2}>⚠️ Konto pausat</Heading>
          
          <Text style={greeting}>Hej {organizationName}!</Text>
          
          <Text style={text}>
            Ditt EP Tracker-konto har tillfälligt pausats.
          </Text>
          
          <Section style={warningBox}>
            <Text style={warningHeading}>
              <strong>Orsak:</strong>
            </Text>
            <Text style={warningText}>{reason}</Text>
          </Section>
          
          <Text style={text}>
            <strong>Vad betyder det?</strong>
          </Text>
          
          <Text style={listItem}>• Du kan inte längre logga in på EP Tracker</Text>
          <Text style={listItem}>• Din data är säker och sparad</Text>
          <Text style={listItem}>• Dina team-medlemmar kan inte heller komma åt kontot</Text>
          <Text style={listItem}>• All funktionalitet är pausad</Text>
          
          <Text style={text}>
            <strong>Hur återaktiverar jag mitt konto?</strong>
          </Text>
          
          <Text style={text}>
            För att återaktivera ditt konto behöver du uppdatera dina betalningsuppgifter och betala eventuella utestående fakturor.
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={contactUrl}>
              Återaktivera konto
            </Button>
          </Section>
          
          <Text style={footer}>
            Behöver du hjälp? Kontakta oss direkt på support@eptracker.se så hjälper vi dig.
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

export default AccountSuspendedEmail;

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

const warningBox = {
  backgroundColor: '#fee2e2',
  border: '2px solid #dc2626',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 20px',
};

const warningHeading = {
  color: '#991b1b',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 8px',
};

const warningText = {
  color: '#991b1b',
  fontSize: '15px',
  lineHeight: '22px',
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

