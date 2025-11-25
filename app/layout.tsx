import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundaryWrapper } from '@/components/core/error-boundary-wrapper';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

export const metadata: Metadata = {
	title: 'EP Tracker',
	description: 'Time tracking and site reporting for Swedish contractors',
	manifest: '/manifest.json',
	icons: {
		icon: '/images/faviconEP.png',
		shortcut: '/images/faviconEP.png',
		apple: '/images/faviconEP.png',
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: 'EP Tracker',
	},
};

export const viewport: Viewport = {
	themeColor: '#1976d2',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='sv' suppressHydrationWarning>
			<head>
				{/* Förhindra vit flash genom att sätta tema innan sidan renderas */}
				<script
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{
						__html: `(() => {
  try {
    const stored = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    const root = document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {
    // ignore
  }
})();`,
					}}
				/>
			</head>
			<body className={`${inter.variable} font-sans antialiased`}>
				<ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
			</body>
		</html>
	);
}
