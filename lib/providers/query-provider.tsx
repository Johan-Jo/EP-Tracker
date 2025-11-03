'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * React Query Provider with optimized caching strategy
 * 
 * PERFORMANCE OPTIMIZATION (Story 26.1):
 * - Enabled proper caching with 5-minute stale time
 * - Set 10-minute garbage collection time
 * - Re-enabled refetch on reconnect for offline support
 * 
 * Expected improvement: 70-80% fewer API calls
 */
export function QueryProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Enable caching for production performance
						staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
						gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache (renamed from cacheTime in React Query v5)
						retry: 2, // Retry failed requests up to 2 times
						
						// Refetch behavior
						refetchOnWindowFocus: false, // Don't refetch on window focus (can be annoying)
						refetchOnReconnect: true, // DO refetch when reconnecting (good for offline support)
						refetchOnMount: true, // Refetch when component mounts if data is stale
					},
					mutations: {
						retry: 1, // Retry failed mutations once
					},
				},
			})
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}


