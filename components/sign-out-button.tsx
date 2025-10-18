'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SignOutButton() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleSignOut = async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/auth/signout', {
				method: 'POST',
			});

			if (res.ok) {
				router.push('/');
				router.refresh();
			}
		} catch (error) {
			console.error('Sign out error:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<button
			onClick={handleSignOut}
			disabled={loading}
			className='rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50'
		>
			{loading ? 'Loggar ut...' : 'Logga ut'}
		</button>
	);
}

