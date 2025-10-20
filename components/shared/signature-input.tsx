'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, PenTool } from 'lucide-react';

interface SignatureInputProps {
	onSign: (signature: { name: string; timestamp: string }) => void;
	label?: string;
	disabled?: boolean;
	existingSignature?: { name: string; timestamp: string } | null;
}

export function SignatureInput({
	onSign,
	label = 'Signatur',
	disabled = false,
	existingSignature,
}: SignatureInputProps) {
	const [name, setName] = useState('');
	const [isSigned, setIsSigned] = useState(!!existingSignature);

	const handleSign = () => {
		if (!name.trim()) return;

		const signature = {
			name: name.trim(),
			timestamp: new Date().toISOString(),
		};

		onSign(signature);
		setIsSigned(true);
	};

	if (isSigned && existingSignature) {
		const signedDate = new Date(existingSignature.timestamp);
		return (
			<Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						<CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<p className="font-medium text-green-900 dark:text-green-100">
								Signerad av {existingSignature.name}
							</p>
							<p className="text-sm text-green-700 dark:text-green-300 mt-1">
								{signedDate.toLocaleString('sv-SE', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit',
								})}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-3">
			<Label htmlFor="signature-name" className="flex items-center gap-2">
				<PenTool className="w-4 h-4" />
				{label}
			</Label>
			<div className="flex gap-2">
				<Input
					id="signature-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Skriv ditt fullständiga namn"
					disabled={disabled}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && name.trim()) {
							e.preventDefault();
							handleSign();
						}
					}}
				/>
				<Button
					type="button"
					onClick={handleSign}
					disabled={!name.trim() || disabled}
					variant="default"
				>
					Signera
				</Button>
			</div>
			<p className="text-xs text-muted-foreground">
				Genom att signera bekräftar du att informationen är korrekt
			</p>
		</div>
	);
}

