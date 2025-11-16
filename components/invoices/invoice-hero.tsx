'use client';

import { FileText, Clock, Package, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceHeroProps {
	// reserved for future props (e.g. counts) – keep but unused for now
}

export function InvoiceHero(_: InvoiceHeroProps) {
	const handleStartClick = () => {
		const el = document.getElementById('invoice-step-1');
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	return (
		<section className="mx-auto mb-6 mt-4 w-full max-w-5xl px-4 md:mt-6 md:px-6">
			<div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-amber-900/35 via-background to-background shadow-sm">
				<div className="flex flex-col gap-6 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7 md:py-6">
					{/* Left: icon, heading, copy, checklist */}
					<div className="flex-1 space-y-4">
						<div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-[11px] font-medium text-amber-200">
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
							Ny fakturaunderlagsvy – steg för steg
						</div>

						<div className="flex items-start gap-3">
							<div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
								<FileText className="h-5 w-5" />
							</div>
							<div>
								<h1 className="text-xl font-semibold tracking-tight md:text-2xl">
									Fakturera utan krångel
								</h1>
								<p className="mt-1 max-w-xl text-sm text-muted-foreground md:text-[15px]">
									EP-Tracker samlar godkänd tid, material, kostnader, ÄTA och dagboksanteckningar till
									ett tydligt fakturaunderlag – du följer bara stegen överst.
								</p>
							</div>
						</div>

						<div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-3 md:text-sm">
							<div className="flex items-start gap-2">
								<Clock className="mt-[2px] h-4 w-4 shrink-0 text-amber-300" />
								<div>
									<p className="font-medium text-foreground">Tid &amp; kostnader</p>
									<p>Vi hämtar all godkänd tid, mil och utlägg åt dig.</p>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<Package className="mt-[2px] h-4 w-4 shrink-0 text-amber-300" />
								<div>
									<p className="font-medium text-foreground">Material &amp; ÄTA</p>
									<p>Material och ÄTA-rader grupperas snyggt per projekt.</p>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<CheckCircle2 className="mt-[2px] h-4 w-4 shrink-0 text-emerald-400" />
								<div>
									<p className="font-medium text-foreground">Inga missar</p>
									<p>Systemet varnar om något inte är godkänt ännu.</p>
								</div>
							</div>
						</div>
					</div>

					{/* Right: “Kom igång”-card */}
					<div className="w-full max-w-xs rounded-xl border border-border/70 bg-background/90 p-4 shadow-sm backdrop-blur md:ml-6">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
							Nästa steg
						</p>
						<p className="mt-1 text-sm font-semibold text-foreground">
							Steg 1 – Välj projekt &amp; period
						</p>
						<p className="mt-2 text-xs text-muted-foreground">
							Välj vilket projekt och vilket datumspann faktureringen gäller. EP-Tracker hämtar sedan alla
							relevanta rader åt dig.
						</p>

						<button
							type="button"
							onClick={handleStartClick}
							className={cn(
								'mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition',
								'hover:bg-primary/90'
							)}
						>
							Kom igång
						</button>

						<p className="mt-2 text-[11px] text-muted-foreground">
							Du kan alltid komma tillbaka hit – inget sparas förrän du låser fakturaunderlaget.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}


