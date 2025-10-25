import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/providers/query-provider';
import { Toaster } from 'react-hot-toast';
import { ZodInit } from '@/components/core/zod-init';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

export const metadata: Metadata = {
	title: 'EP Time Tracker',
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
		<html lang='sv'>
			<body className={`${inter.variable} font-sans antialiased`}>
				<ZodInit />
				<QueryProvider>{children}</QueryProvider>
				<Toaster position="top-center" />
			</body>
		</html>
	);
}
