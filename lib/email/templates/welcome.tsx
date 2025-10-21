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

interface WelcomeEmailProps {
  userName: string;
  organizationName: string;
  dashboardUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const WelcomeEmail = ({
  userName,
  organizationName,
  dashboardUrl = `${baseUrl}/dashboard`,
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Välkommen till EP Tracker!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>EP Tracker</Heading>
          <Heading style={h2}>🎉 Välkommen!</Heading>
          
          <Text style={greeting}>Hej {userName}!</Text>
          
          <Text style={text}>
            Välkommen till EP Tracker - din nya partner för smart projekthantering i byggbranschen!
          </Text>
          
          <Text style={text}>
            Du är nu medlem i <strong>{organizationName}</strong> och har tillgång till alla funktioner under din 14-dagars kostnadsfria provperiod.
          </Text>
          
          <Section style={featuresBox}>
            <Text style={featuresHeading}>
              <strong>Vad kan du göra med EP Tracker?</strong>
            </Text>
            <Text style={featureItem}>✓ Tidrapportering direkt från mobilen</Text>
            <Text style={featureItem}>✓ Materialhantering och utgifter</Text>
            <Text style={featureItem}>✓ Projektöversikt i realtid</Text>
            <Text style={featureItem}>✓ Automatisk export för fakturering</Text>
            <Text style={featureItem}>✓ Offline-läge - fungerar överallt</Text>
          </Section>
          
          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              Kom igång nu
            </Button>
          </Section>
          
          <Text style={text}>
            Behöver du hjälp? Tveka inte att kontakta oss på support@eptracker.se
          </Text>
          
          <Text style={footer}>
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

export default WelcomeEmail;

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
  fontSize: '28px',
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

const featuresBox = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #86efac',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 20px',
};

const featuresHeading = {
  color: '#166534',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 12px',
};

const featureItem = {
  color: '#166534',
  fontSize: '15px',
  lineHeight: '28px',
  margin: '4px 0',
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

