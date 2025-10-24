'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

function InviteCallbackContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);
	const [debugInfo, setDebugInfo] = useState<string>('');

	useEffect(() => {
		const handleInviteCallback = async () => {
			try {
				const supabase = createClient();
				
				// Get hash parameters (where Supabase might put the tokens)
				const hash = window.location.hash.substring(1);
				const hashParams = new URLSearchParams(hash);
				const accessToken = hashParams.get('access_token');
				const refreshToken = hashParams.get('refresh_token');
				const hashType = hashParams.get('type');

				// Get query parameters (where Supabase might put the code)
				const code = searchParams.get('code');
				const error_code = searchParams.get('error_code');
				const error_description = searchParams.get('error_description');

				console.log('Invite callback - Full URL:', window.location.href);
				console.log('Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, hashType });
				console.log('Query params:', { code: !!code, error_code, error_description });

				setDebugInfo(`Hash: ${hash}, Query: ${window.location.search}`);

				// Check for errors first
				if (error_code) {
					console.error('Auth error:', error_code, error_description);
					setError(`Error: ${error_description || error_code}`);
					setTimeout(() => router.push('/sign-in'), 3000);
					return;
				}

				// Try code exchange first (most common for invite flow)
				if (code) {
					console.log('Exchanging code for session...');
					const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
					
					if (exchangeError) {
						console.error('Error exchanging code:', exchangeError);
						setError('Failed to complete invitation (code exchange failed)');
						setTimeout(() => router.push('/sign-in'), 3000);
						return;
					}

					console.log('Code exchanged successfully!', data);
					console.log('User data:', data.user);
					
					// ALWAYS redirect to password setup for invite-callback route
					// Users coming through this route are being invited
					console.log('Invite callback detected, redirecting to password setup...');
					router.push('/set-password');
					return;
				}

				// Try direct token method (alternative flow)
				if (accessToken && refreshToken) {
					console.log('Setting session with tokens...');
					const { error: sessionError } = await supabase.auth.setSession({
						access_token: accessToken,
						refresh_token: refreshToken,
					});

					if (sessionError) {
						console.error('Error setting session:', sessionError);
						setError('Failed to complete invitation (session setup failed)');
						setTimeout(() => router.push('/sign-in'), 3000);
						return;
					}

					// ALWAYS redirect to password setup for invite-callback route
					console.log('Invite callback (token method), redirecting to password setup...');
					router.push('/set-password');
					return;
				}

				// No valid auth data found
				console.error('No valid auth data found in URL');
				setError('Invalid invitation link - no auth data found');
				setTimeout(() => router.push('/sign-in'), 3000);
			} catch (err) {
				console.error('Error in invite callback:', err);
				setError('An unexpected error occurred');
				setTimeout(() => router.push('/sign-in'), 3000);
			}
		};

		handleInviteCallback();
	}, [router, searchParams]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
			<div className="text-center max-w-2xl px-4">
				{error ? (
					<div className="space-y-4">
						<div className="text-red-600 text-lg font-semibold">{error}</div>
						<p className="text-gray-600">Redirecting to login...</p>
						{debugInfo && (
							<div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs font-mono break-all">
								<div className="font-bold mb-2">Debug Info:</div>
								{debugInfo}
							</div>
						)}
					</div>
				) : (
					<div className="space-y-4">
						<Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto" />
						<p className="text-gray-600 text-lg">Completing your invitation...</p>
						<p className="text-gray-500 text-sm">Please wait while we set up your account</p>
					</div>
				)}
			</div>
		</div>
	);
}

export default function InviteCallbackPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
				<div className="text-center">
					<Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto" />
					<p className="text-gray-600 text-lg mt-4">Loading...</p>
				</div>
			</div>
		}>
			<InviteCallbackContent />
		</Suspense>
	);
}
