import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/providers/query-provider';
import { Toaster } from 'react-hot-toast';
import { ZodInit } from '@/components/core/zod-init';
import { NotificationHandler } from '@/components/core/notification-handler';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

export const metadata: Metadata = {
	title: 'Tidrapportering bygg - offline & veckoplanering | EP-Tracker',
	description: 'Allt-i-ett för bygglag: tid, veckoplanering, dagbok och attest. Offline i fält och klara underlag för lön/faktura',
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
				<NotificationHandler />
				<QueryProvider>{children}</QueryProvider>
				<Toaster position="top-center" />
			</body>
		</html>
	);
}
