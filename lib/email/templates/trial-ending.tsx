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

interface TrialEndingEmailProps {
  organizationName: string;
  trialEndsInDays?: number;
  isEnded?: boolean;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const TrialEndingEmail = ({
  organizationName,
  trialEndsInDays = 3,
  isEnded = false,
}: TrialEndingEmailProps) => {
  const subject = isEnded
    ? 'Din EP Tracker-provperiod har slutat'
    : `Din EP Tracker-provperiod slutar om ${trialEndsInDays} dagar`;
  
  const heading = isEnded
    ? 'Din provperiod har slutat'
    : `Endast ${trialEndsInDays} dagar kvar!`;
  
  const message = isEnded
    ? 'Din kostnadsfria provperiod för EP Tracker har nu slutat. Vi hoppas att du har uppskattat tjänsten och sett hur den kan effektivisera din verksamhet med tidrapportering, material och utgifter.'
    : `Din kostnadsfria provperiod för EP Tracker slutar om ${trialEndsInDays} dagar. För att fortsätta använda EP Tracker och behålla all din data, behöver du uppgradera till en betald plan.`;
  
  const ctaText = isEnded ? 'Välj en plan' : 'Uppgradera nu';
  const ctaUrl = `${baseUrl}/dashboard/settings/billing`;

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>EP Tracker</Heading>
          <Heading style={h2}>{heading}</Heading>
          
          <Text style={greeting}>Hej {organizationName}!</Text>
          
          <Text style={text}>{message}</Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={ctaUrl}>
              {ctaText}
            </Button>
          </Section>
          
          <Text style={text}>
            {isEnded 
              ? 'Välj en plan som passar era behov och fortsätt arbeta smart med EP Tracker.'
              : 'Våra planer börjar från 199 kr/månad och inkluderar allt du behöver för att hantera dina projekt effektivt.'
            }
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

export default TrialEndingEmail;

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
