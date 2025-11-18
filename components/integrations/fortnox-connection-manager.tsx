'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link2, Unlink, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FortnoxConnectionManagerProps {
	orgId: string;
}

interface FortnoxConnection {
	id: string;
	org_id: string;
	access_token: string;
	refresh_token: string;
	access_token_expires_at: string;
	scopes: string | null;
	fortnox_customer_number: string | null;
	created_at: string;
	updated_at: string;
}

export function FortnoxConnectionManager({ orgId }: FortnoxConnectionManagerProps) {
	const queryClient = useQueryClient();


	// Fetch current connection status
	const { data: connection, isLoading, error } = useQuery<FortnoxConnection | null>({
		queryKey: ['fortnox-connection', orgId],
		queryFn: async () => {
			// Add timeout to prevent hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

			try {
				const response = await fetch(`/api/integrations/fortnox/connection?orgId=${orgId}`, {
					signal: controller.signal,
				});
				clearTimeout(timeoutId);

				if (response.status === 404) {
					return null; // No connection exists
				}
				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error || 'Failed to fetch Fortnox connection');
				}
				const data = await response.json();
				return data.connection;
			} catch (err) {
				clearTimeout(timeoutId);
				if (err instanceof Error && err.name === 'AbortError') {
					throw new Error('Request timeout - please try again');
				}
				throw err;
			}
		},
		retry: 1,
		retryDelay: 1000,
		staleTime: 30 * 1000, // 30 seconds
		refetchOnMount: false, // Don't refetch on mount if data exists
	});


	// Initiate OAuth flow
	const initiateOAuth = useMutation({
		mutationFn: async () => {
			const response = await fetch('/api/integrations/fortnox/oauth/initiate');
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to initiate OAuth');
			}
			const data = await response.json();
			return data.authUrl;
		},
		onSuccess: (authUrl) => {
			// Redirect to Fortnox OAuth
			window.location.href = authUrl;
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte starta Fortnox-anslutning');
		},
	});



	// Disconnect Fortnox
	const disconnectMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch('/api/integrations/fortnox/oauth/disconnect', {
				method: 'DELETE',
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to disconnect');
			}
		},
		onSuccess: () => {
			toast.success('Fortnox-anslutning borttagen');
			queryClient.invalidateQueries({ queryKey: ['fortnox-connection', orgId] });
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte koppla bort Fortnox');
		},
	});

	// Check for OAuth callback messages in URL
	useEffect(() => {
		// Only run on client side
		if (typeof window === 'undefined') return;

		const params = new URLSearchParams(window.location.search);
		const connected = params.get('fortnox_connected');
		const error = params.get('fortnox_error');

		if (connected === 'success') {
			toast.success('Fortnox-anslutning etablerad!');
			queryClient.invalidateQueries({ queryKey: ['fortnox-connection', orgId] });
			// Clean URL
			window.history.replaceState({}, '', window.location.pathname);
		}

		if (error) {
			toast.error(`Fortnox-anslutning misslyckades: ${decodeURIComponent(error)}`);
			// Clean URL
			window.history.replaceState({}, '', window.location.pathname);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

	const isConnected = !!connection;
	const expiresAt = connection ? new Date(connection.access_token_expires_at) : null;
	const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
	const expiresSoon = expiresAt ? expiresAt.getTime() < Date.now() + 24 * 60 * 60 * 1000 : false; // Within 24 hours

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Fortnox Integration</CardTitle>
					<CardDescription>Anslut ditt Fortnox-konto för att exportera fakturor</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-8">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Fortnox Integration</CardTitle>
					<CardDescription>Anslut ditt Fortnox-konto för att exportera fakturor</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<XCircle className="h-4 w-4" />
						<AlertDescription>
							{error instanceof Error ? error.message : 'Kunde inte ladda Fortnox-anslutning'}
						</AlertDescription>
					</Alert>
					<Button
						onClick={() => queryClient.invalidateQueries({ queryKey: ['fortnox-connection', orgId] })}
						className="mt-4 w-full"
						variant="outline"
					>
						Försök igen
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Fortnox Integration</CardTitle>
				<CardDescription>
					Anslut ditt Fortnox-konto för att exportera fakturor direkt till Fortnox
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isConnected ? (
					<>
						<div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
							<div className="flex items-center gap-3">
								<CheckCircle2 className="w-5 h-5 text-green-600" />
								<div>
									<p className="font-medium">Ansluten till Fortnox</p>
									<p className="text-sm text-muted-foreground">
										Anslutning skapad{' '}
										{new Date(connection.created_at).toLocaleDateString('sv-SE', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										})}
									</p>
								</div>
							</div>
							<Badge variant={isExpired ? 'destructive' : expiresSoon ? 'secondary' : 'default'}>
								{isExpired ? 'Utgången' : expiresSoon ? 'Går snart ut' : 'Aktiv'}
							</Badge>
						</div>

						{expiresAt && (
							<Alert variant={isExpired ? 'destructive' : expiresSoon ? 'default' : 'default'}>
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									{isExpired
										? 'Access token har gått ut. Anslutningen kommer automatiskt förnyas vid nästa export.'
										: expiresSoon
											? `Access token går ut ${expiresAt.toLocaleDateString('sv-SE')}. Anslutningen förnyas automatiskt vid behov.`
											: `Access token är giltig till ${expiresAt.toLocaleDateString('sv-SE')}.`}
								</AlertDescription>
							</Alert>
						)}

						{connection.scopes && (
							<div className="text-sm text-muted-foreground">
								<p className="font-medium mb-1">Behörigheter:</p>
								<p>{connection.scopes}</p>
							</div>
						)}


						<Button
							variant="destructive"
							onClick={() => disconnectMutation.mutate()}
							disabled={disconnectMutation.isPending}
							className="w-full mt-4"
						>
							{disconnectMutation.isPending ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Kopplar bort...
								</>
							) : (
								<>
									<Unlink className="w-4 h-4 mr-2" />
									Koppla bort Fortnox
								</>
							)}
						</Button>
					</>
				) : (
					<>
						<div className="flex items-center justify-between p-4 rounded-lg border border-dashed">
							<div className="flex items-center gap-3">
								<XCircle className="w-5 h-5 text-muted-foreground" />
								<div>
									<p className="font-medium">Ej ansluten</p>
									<p className="text-sm text-muted-foreground">
										Anslut ditt Fortnox-konto för att exportera fakturor
									</p>
								</div>
							</div>
						</div>

						<Button
							onClick={() => initiateOAuth.mutate()}
							disabled={initiateOAuth.isPending}
							className="w-full"
						>
							{initiateOAuth.isPending ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Ansluter...
								</>
							) : (
								<>
									<Link2 className="w-4 h-4 mr-2" />
									Anslut till Fortnox
								</>
							)}
						</Button>

						<p className="text-xs text-muted-foreground">
							När du klickar på "Anslut till Fortnox" omdirigeras du till Fortnox för att godkänna
							åtkomst. Du behöver ha ett Fortnox-konto med administratörsbehörighet.
						</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}


