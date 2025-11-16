'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Check, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface InvoiceOnboardingProps {
	orgId: string;
	onComplete: () => void;
}

/**
 * Invoice Onboarding Component
 * 
 * Shown the first time any user opens the Fakturaunderlag page for an organization.
 * Ensures org info and bank/payment info are configured before proceeding.
 */
export function InvoiceOnboarding({ orgId, onComplete }: InvoiceOnboardingProps) {
	const [orgInfoChecked, setOrgInfoChecked] = useState(false);
	const [paymentInfoChecked, setPaymentInfoChecked] = useState(false);
	const router = useRouter();

	const completeOnboarding = useMutation({
		mutationFn: async () => {
			const response = await fetch('/api/invoice/onboarding', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte slutföra onboarding');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Onboarding slutförd');
			onComplete();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte slutföra onboarding');
		},
	});

	const handleContinue = () => {
		if (!orgInfoChecked || !paymentInfoChecked) {
			toast.error('Du måste bekräfta att båda stegen är klara');
			return;
		}
		completeOnboarding.mutate();
	};

	const handleOpenOrgSettings = () => {
		router.push('/dashboard/settings/organization');
	};

	const handleOpenPaymentSettings = () => {
		// Navigate to organization settings page and focus on payment section
		// For now, just navigate to organization settings - they can see payment fields there
		router.push('/dashboard/settings/organization');
	};

	return (
		<div className="flex h-full flex-col bg-gray-50 dark:bg-black">
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-8">
				<Card className="border-2 border-primary/20">
					<CardHeader>
						<CardTitle className="text-2xl">Innan du skapar ditt första fakturaunderlag</CardTitle>
						<CardDescription>
							Innan du kan börja skapa fakturaunderlag behöver vi säkerställa att all nödvändig
							information är korrekt konfigurerad.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Företagsuppgifter */}
						<div className="rounded-lg border border-border/60 bg-card/50 p-4">
							<div className="flex items-start gap-3">
								<Checkbox
									id="org-info"
									checked={orgInfoChecked}
									onCheckedChange={(checked) => setOrgInfoChecked(checked === true)}
									className="mt-1"
								/>
								<div className="flex-1 space-y-2">
									<label
										htmlFor="org-info"
										className="cursor-pointer text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										Företagsuppgifter klara
									</label>
									<p className="text-sm text-muted-foreground">
										Kontrollera att organisationsnamn, adress, organisationsnummer, telefon och
										kontaktinformation är korrekt ifyllda.
									</p>
									<Button
										variant="outline"
										size="sm"
										onClick={handleOpenOrgSettings}
										className="mt-2"
									>
										<ExternalLink className="mr-2 h-4 w-4" />
										Öppna organisationsinställningar
									</Button>
								</div>
							</div>
						</div>

						{/* Bank- och betaluppgifter */}
						<div className="rounded-lg border border-border/60 bg-card/50 p-4">
							<div className="flex items-start gap-3">
								<Checkbox
									id="payment-info"
									checked={paymentInfoChecked}
									onCheckedChange={(checked) => setPaymentInfoChecked(checked === true)}
									className="mt-1"
								/>
								<div className="flex-1 space-y-2">
									<label
										htmlFor="payment-info"
										className="cursor-pointer text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										Bank- och betaluppgifter klara
									</label>
									<p className="text-sm text-muted-foreground">
										Kontrollera att bankgiro, plusgiro, IBAN, BIC/SWIFT eller Swish-information är
										korrekt ifyllda för fakturering.
									</p>
									<Button
										variant="outline"
										size="sm"
										onClick={handleOpenPaymentSettings}
										className="mt-2"
									>
										<ExternalLink className="mr-2 h-4 w-4" />
										Öppna betalinställningar
									</Button>
								</div>
							</div>
						</div>

						{/* Continue Button */}
						<div className="flex justify-end pt-4">
							<Button
								onClick={handleContinue}
								disabled={!orgInfoChecked || !paymentInfoChecked || completeOnboarding.isPending}
								size="lg"
							>
								{completeOnboarding.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Sparar...
									</>
								) : (
									<>
										<CheckCircle2 className="mr-2 h-4 w-4" />
										Fortsätt till fakturaunderlag
									</>
								)}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

