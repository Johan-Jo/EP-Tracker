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

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiresIn?: string;
}

export const PasswordResetEmail = ({
  userName,
  resetUrl,
  expiresIn = '24 timmar',
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Återställ ditt lösenord för EP Tracker</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>EP Tracker</Heading>
          <Heading style={h2}>🔒 Återställ lösenord</Heading>
          
          <Text style={greeting}>Hej {userName}!</Text>
          
          <Text style={text}>
            Vi har tagit emot en begäran om att återställa lösenordet för ditt EP Tracker-konto.
          </Text>
          
          <Text style={text}>
            Klicka på knappen nedan för att välja ett nytt lösenord:
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Återställ lösenord
            </Button>
          </Section>
          
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>⏰ Viktigt:</strong> Denna länk är giltig i {expiresIn}. Efter det måste du begära en ny återställningslänk.
            </Text>
          </Section>
          
          <Text style={text}>
            Om du inte har begärt en lösenordsåterställning kan du ignorera detta mail. Ditt lösenord kommer inte att ändras.
          </Text>
          
          <Section style={securityBox}>
            <Text style={securityHeading}>
              <strong>🛡️ Säkerhetstips:</strong>
            </Text>
            <Text style={securityItem}>• Använd aldrig samma lösenord på flera platser</Text>
            <Text style={securityItem}>• Välj ett starkt lösenord med minst 8 tecken</Text>
            <Text style={securityItem}>• Kombinera stora och små bokstäver, siffror och symboler</Text>
            <Text style={securityItem}>• Dela aldrig ditt lösenord med någon</Text>
          </Section>
          
          <Text style={footer}>
            Har du problem? Kontakta oss på support@eptracker.se
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

export default PasswordResetEmail;

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
  color: '#333',
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

const infoBox = {
  backgroundColor: '#dbeafe',
  border: '2px solid #3b82f6',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 20px',
};

const infoText = {
  color: '#1e3a8a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const securityBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 20px',
};

const securityHeading = {
  color: '#111827',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
};

const securityItem = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
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

