'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// NO CACHING during development - always fetch fresh data
						staleTime: 0,
						gcTime: 0, // Renamed from cacheTime in React Query v5
						retry: 1,
						// Disable automatic refetching to avoid confusion during development
						refetchOnWindowFocus: false,
						refetchOnReconnect: false,
					},
				},
			})
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

