'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ImpersonateButtonProps {
	userId: string;
	userName: string;
}

export function ImpersonateButton({ userId, userName }: ImpersonateButtonProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	async function handleImpersonate() {
		if (!confirm(`Är du säker på att du vill impersonera ${userName}? Alla åtgärder kommer att loggas.`)) {
			return;
		}

		setLoading(true);
		try {
			const response = await fetch('/api/super-admin/support/impersonate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ user_id: userId }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte starta impersonation');
			}

			const data = await response.json();
			toast.success('Impersonation startad', {
				description: `Du är nu inloggad som ${userName}`,
			});

			// Redirect to dashboard
			window.location.href = data.redirect || '/dashboard';
		} catch (error) {
			console.error('Error impersonating user:', error);
			toast.error('Kunde inte starta impersonation', {
				description: error instanceof Error ? error.message : 'Ett fel uppstod',
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<Button
			onClick={handleImpersonate}
			disabled={loading}
			variant="outline"
			size="sm"
		>
			<UserCog className="w-4 h-4 mr-2" />
			{loading ? 'Startar...' : 'Impersonera'}
		</Button>
	);
}

