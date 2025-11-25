'use client';

import { ErrorBoundary } from './error-boundary';
import { QueryProvider } from '@/lib/providers/query-provider';
import { ToasterProvider } from '@/components/core/toaster';
import ThemeProvider from '@/components/core/theme-provider';
import { ZodInit } from '@/components/core/zod-init';
import { NotificationHandler } from '@/components/core/notification-handler';
import type { ReactNode } from 'react';

interface ErrorBoundaryWrapperProps {
	children: ReactNode;
}

export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
	return (
		<ErrorBoundary>
			<ThemeProvider>
				<ZodInit />
				<NotificationHandler />
				<QueryProvider>{children}</QueryProvider>
				<ToasterProvider />
			</ThemeProvider>
		</ErrorBoundary>
	);
}

