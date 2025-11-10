import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { QueryProvider } from '@/lib/providers/query-provider';
import { Toaster } from 'sonner';
import { ZodInit } from '@/components/core/zod-init';
import { NotificationHandler } from '@/components/core/notification-handler';
import ThemeProvider from '@/components/core/theme-provider';
import { AppStartupLoader } from '@/components/core/app-startup-loader';

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
 const themeScript = `(() => {
 	try {
 		const storageTheme = window.localStorage.getItem('theme');
 		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
 		const theme = storageTheme === 'light' || storageTheme === 'dark' ? storageTheme : (prefersDark ? 'dark' : 'light');
 		const root = document.documentElement;
 		root.classList.toggle('dark', theme === 'dark');
 		root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
 	} catch (_) {}
 })();`;
	return (
		<html lang='sv' suppressHydrationWarning>
			<body className={`${inter.variable} font-sans antialiased`}>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
				<ThemeProvider>
					<AppStartupLoader />
					<ZodInit />
					<NotificationHandler />
					<QueryProvider>{children}</QueryProvider>
					<Toaster position="top-right" richColors />
					<Analytics />
				</ThemeProvider>
			</body>
		</html>
	);
}
