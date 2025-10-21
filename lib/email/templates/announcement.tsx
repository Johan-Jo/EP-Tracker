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

interface AnnouncementEmailProps {
  organizationName: string;
  subject: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
}

export const AnnouncementEmail = ({
  organizationName,
  subject,
  message,
  ctaText,
  ctaUrl,
}: AnnouncementEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>EP Tracker</Heading>
          <Heading style={h2}>{subject}</Heading>
          
          <Text style={greeting}>Hej {organizationName},</Text>
          
          <Text style={text}>{message}</Text>
          
          {ctaText && ctaUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={ctaUrl}>
                {ctaText}
              </Button>
            </Section>
          )}
          
          <Text style={footer}>
            Med vänliga hälsningar,
            <br />
            EP Tracker Team
          </Text>
          
          <Text style={footerSmall}>
            © {new Date().getFullYear()} EP Tracker. Alla rättigheter förbehållna.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AnnouncementEmail;

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
  whiteSpace: 'pre-wrap' as const,
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
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 20px',
  margin: '32px 0 0',
};

const footerSmall = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 20px',
  margin: '12px 0',
  textAlign: 'center' as const,
};

