import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/providers/query-provider';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

export const metadata: Metadata = {
	title: 'EP Time Tracker',
	description: 'Time tracking and site reporting for Swedish contractors',
	manifest: '/manifest.json',
	themeColor: '#1976d2',
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: 'EP Tracker',
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='sv'>
			<body className={`${inter.variable} font-sans antialiased`}>
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	);
}
