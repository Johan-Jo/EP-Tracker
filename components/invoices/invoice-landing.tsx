'use client';

import { FileText, Clock, Package, CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type InvoiceRole = 'admin' | 'finance';

interface InvoiceLandingProps {
	/**
	 * Optional role hint so we can show more relevant copy.
	 * If not provided, default to 'finance'.
	 */
	role?: InvoiceRole;
}

const roleCopy: Record<InvoiceRole, { badge: string; title: string; text: string }> = {
	admin: {
		badge: 'Admin',
		title: 'Du kan godkänna, låsa och exportera',
		text: 'Här ser du alla poster som behöver ditt godkännande innan fakturering och kan låsa fakturaunderlaget när allt ser rätt ut.',
	},
	finance: {
		badge: 'Ekonomi',
		title: 'Du skapar underlag – admin godkänner',
		text: 'Du ser hela underlaget, kan upptäcka saknade godkännanden och skicka påminnelser till admin när något behöver åtgärdas.',
	},
};

export function InvoiceLanding({ role = 'finance' }: InvoiceLandingProps) {
	const copy = roleCopy[role];

	const handleStartClick = () => {
		const el = document.getElementById('invoice-step-1');
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	return (
		<section className="mx-auto mb-6 w-full max-w-5xl px-4 md:px-6">
			<div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-amber-900/40 via-background to-background shadow-sm">
				<div className="grid gap-6 px-5 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] md:px-7 md:py-7">
					{/* Vänster sida: huvudtext om fakturaunderlag */}
					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/18 text-primary">
								<FileText className="h-5 w-5" />
							</div>
							<div>
								<h1 className="text-xl font-semibold tracking-tight md:text-2xl">
									Fakturaunderlag – allt samlat på ett ställe
								</h1>
								<p className="mt-1 max-w-xl text-sm text-muted-foreground md:text-[15px]">
									Här samlar EP-Tracker godkänd tid, material, kostnader, ÄTA och dagboksanteckningar till ett
									fakturaunderlag du kan lita på. Du följer bara stegen ovan – vi ser till att inget viktigt missas.
								</p>
							</div>
						</div>

						<div>
							<p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
								Så funkar det
							</p>
							<div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-3 md:text-[13px]">
								<div className="flex items-start gap-2">
									<Clock className="mt-[2px] h-4 w-4 shrink-0 text-amber-300" />
									<div>
										<p className="font-medium text-foreground">1. Välj projekt</p>
										<p>
											Du väljer projekt – vi föreslår ett datumspann som täcker alla poster som finns
											för projektet (både godkända och väntande). Du kan alltid justera själv.
										</p>
									</div>
								</div>
								<div className="flex items-start gap-2">
									<Package className="mt-[2px] h-4 w-4 shrink-0 text-amber-300" />
									<div>
										<p className="font-medium text-foreground">2. Kolla godkännanden</p>
										<p>Systemet visar tydligt om tid, material eller ÄTA saknar godkännande.</p>
									</div>
								</div>
								<div className="flex items-start gap-2">
									<CheckCircle2 className="mt-[2px] h-4 w-4 shrink-0 text-emerald-400" />
									<div>
										<p className="font-medium text-foreground">3. Förhandsgranska &amp; lås</p>
										<p>När allt ser bra ut låser du underlaget och exporterar till ekonomisystemet.</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Höger sida: Din roll + call to action */}
					<aside className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/92 p-4 shadow-sm backdrop-blur">
						<div className="space-y-3">
							<div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-[11px] font-medium text-amber-100">
								<ShieldCheck className="h-3.5 w-3.5" />
								<span>{copy.badge} i den här vyn</span>
							</div>

							<div>
								<p className="text-sm font-semibold text-foreground">{copy.title}</p>
								<p className="mt-1 text-xs text-muted-foreground">{copy.text}</p>
							</div>
						</div>

						<div className="mt-4 space-y-2">
							<button
								type="button"
								onClick={handleStartClick}
								className={cn(
									'inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition',
									'hover:bg-primary/90',
								)}
							>
								Börja med Steg&nbsp;1 – välj projekt
							</button>
							<p className="text-[11px] text-muted-foreground">
								Ingen data ändras förrän du godkänner eller låser fakturaunderlaget, så du kan lugnt testa dig fram.
							</p>
						</div>
					</aside>
				</div>
			</div>
		</section>
	);
}


