// components/PayrollPdf.tsx

import React from "react";

type Money = number; // SEK
type Hours = number; // decimal hours, ex 1.5 = 1h30m

type Row = {
	date: string;              // "2025-10-26"
	project: string;
	id06?: string;
	employmentType?: "Anställd" | "UE" | "-";
	source?: string;           // "Dagbok #123", "Foto #abc", "Liggare #456"
	standbyOrCall?: "Beredskap" | "Jour" | "-";
	code: string;              // systemkod
	wageItem: string;          // löneartnamn, ex "Övertid Kvalificerad"
	qty: number;               // antal timmar/st
	unit: "h" | "st" | "km" | "dygn";
	unitPrice: Money;          // à-pris
	amount: Money;             // belopp
	account?: string;          // konto/kst
	hasWarning?: boolean;      // markera liten ikon
};

type Totals = {
	ord: Hours;
	mertid: Hours;
	otEnkel: Hours;
	otKval: Hours;
	obKv: Hours;
	obNatt: Hours;
	obHelg: Hours;
	sick: Hours;
	vab: Hours;
	vacation: Hours;
	leave: Hours;
	breaks: Hours;
	worked: Hours;
	gross: Money;
};

type Employee = {
	name: string;
	ssnMasked?: string;      // ÅÅMMDD-****
	employmentForm?: string; // Tillsvidare/Visstid/UE
	hourly?: Money;          // Timlön
	agreement?: string;      // "Byggavtalet"
};

type Meta = {
	company: string;
	periodFrom: string;   // "2025-10-31"
	periodTo: string;     // "2025-11-29"
	generatedAt: string;  // "2025-11-06 17:13"
	version: string;      // "1.0"
	locks: boolean;
	createdBy: string;    // "System 2025-11-05 21:10"
	approvedBy?: string;  // "Admin 2025-11-06 15:58"
	targets?: ("Fortnox" | "Visma")[];
	fileName?: string;    // för footer
};

type ProjectSubtotal = {
	project: string;
	sumOrd: Money;
	sumOTKval: Money;
	sumOBStor?: Money;
	sumAll: Money;
};

type Props = {
	meta: Meta;
	employee: Employee;
	totals: Totals;
	rows: Row[];
	projectSubtotals?: ProjectSubtotal[];
	topDeviations?: { date: string; hours: Hours }[];
	issues?: string[]; // kontrollista
};

export default function PayrollPdf({
	meta,
	employee,
	totals,
	rows,
	projectSubtotals = [],
	topDeviations = [],
	issues = [],
}: Props) {
	return (
		<html lang="sv">
			<head>
				<meta charSet="utf-8" />
				<title>Löneunderlag – {employee.name}</title>

				{/* Minimal print CSS som inte är beroende av Tailwind */}
				<style>{`
					@page { size: A4; margin: 16mm 18mm; }
					* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
					body { color:#111; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial; line-height:1.35; font-size: 11px; }
					header, section { break-inside: avoid; }
					table { width:100%; border-collapse: collapse; table-layout: fixed; }
					thead { display: table-header-group; }
					th { font-weight:600; font-size:11px; color:#444; border-bottom:1px solid #E5E7EB; padding:8px 12px; text-align:left; background: white; }
					td { font-size:11px; color:#111; border-bottom:1px solid #F1F5F9; padding:8px 12px; vertical-align:top; }
					tr:nth-child(even) td { background:#FAFAFA; }
					.num { text-align:right; font-variant-numeric: tabular-nums; white-space:nowrap; }
					.center { text-align:center; }
					.dim { color:#9CA3AF; }
					.col-warn { width:4%; text-align:center; }
					.warn { color:#C2410C; font-weight:600; }
					.badge { background:#F3F4F6; color:#444; border-radius:9999px; padding:6px 10px; font-weight:600; font-size:10px; text-transform: uppercase; display: inline-block; }
					.card { border:1px solid #E5E7EB; border-radius:12px; background:#fff; padding:16px; box-shadow: 0 1px 0 rgba(0,0,0,0.04); }
					.muted { color:#555; }
					.grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
					.gridMeta { display:grid; grid-template-columns: 1fr auto; gap:20px; align-items:end; }
					footer { position:fixed; bottom:10mm; left:18mm; right:18mm; display:flex; justify-content:space-between; font-size:10px; color:#555; }
					.nowrap { white-space: nowrap; }
					.truncate { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
					.truncate2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
					.chipWarn { color:#C2410C; font-weight:600; }
					.prose-num { font-variant-numeric: tabular-nums; }
					.summary-row { display:flex; justify-content:space-between; }
					.summary-row .num { text-align:right; font-variant-numeric: tabular-nums; }
					td.num { text-align:right; font-variant-numeric: tabular-nums; white-space:nowrap; }
					td.center { text-align:center; }
				`}</style>
			</head>

			<body className="prose-num">
				{/* HEADER */}
				<header className="mb-4">
					<div className="gridMeta">
						<div>
							<div className="text-sm font-semibold">{meta.company}</div>
							<h1 className="text-2xl font-bold" style={{whiteSpace: 'nowrap'}}>Löneunderlag</h1>
						</div>
						<div className="text-right text-[11px] muted">
							<div>Period: {meta.periodFrom} – {meta.periodTo}</div>
							<div>Genererad: {meta.generatedAt}</div>
							<div>Version: {meta.version}</div>
							<div style={{marginTop: '4px', display: 'flex', gap: '6px', justifyContent: 'flex-end'}}>
								{(meta.targets ?? []).map((t) => (
									<span key={t} className="badge">{t}</span>
								))}
							</div>
						</div>
					</div>
				</header>

				{/* ATTEST & MEDARBETARE */}
				<section className="grid2 mb-3">
					<div className="card">
						<div className="text-sm font-semibold mb-1">Atteststatus</div>
						<table>
							<tbody>
								<tr><td>Skapad av</td><td className="num">{formatAttestation(meta.createdBy)}</td></tr>
								{meta.approvedBy && <tr><td>Attesterad av</td><td className="num">{formatAttestation(meta.approvedBy)}</td></tr>}
								<tr><td>Låsta poster</td><td className="num"><span className="badge">{meta.locks ? "Ja" : "Nej"}</span></td></tr>
							</tbody>
						</table>
					</div>

					<div className="card">
						<div className="text-sm font-semibold mb-1">Medarbetare</div>
						<table>
							<tbody>
								<tr><td>Namn</td><td className="num">{employee.name}</td></tr>
								<tr><td>Personnummer</td><td className="num">{employee.ssnMasked ?? "Ej angivet"}</td></tr>
								<tr><td>Anställningsform</td><td className="num">{employee.employmentForm ?? "–"}</td></tr>
								{employee.hourly != null && <tr><td>Timlön</td><td className="num">{fmtMoney(employee.hourly)} SEK/h</td></tr>}
								<tr><td>Avtal</td><td className="num">{employee.agreement ?? "–"}</td></tr>
							</tbody>
						</table>
					</div>
				</section>

				{/* SUMMARIES */}
				<section className="grid2 mb-3">
					<div className="card">
						<div className="text-sm font-semibold mb-1">Översikt – Timmar</div>
						<SummaryRow label="Ordinarie tid" value={fmtHours(totals.ord)} />
						<SummaryRow label="Mertid" value={fmtHours(totals.mertid)} />
						<SummaryRow label="Övertid Enkel" value={fmtHours(totals.otEnkel)} />
						<SummaryRow label="Övertid Kvalificerad" value={fmtHours(totals.otKval)} />
						<SummaryRow label="OB Kväll" value={fmtHours(totals.obKv)} />
						<SummaryRow label="OB Natt" value={fmtHours(totals.obNatt)} />
						<SummaryRow label="OB Helg" value={fmtHours(totals.obHelg)} />
						<SummaryRow label="Raster" value={fmtHours(totals.breaks)} />
						<div className="summary-row mt-2 font-semibold" style={{fontSize: '13px'}}>
							<span>Total arbetad tid</span><span className="num">{fmtHours(totals.worked)}</span>
						</div>
					</div>

					<div className="card">
						<div className="text-sm font-semibold mb-1">Översikt – Frånvaro</div>
						<SummaryRow label="Sjuk" value={fmtHours(totals.sick)} />
						<SummaryRow label="VAB" value={fmtHours(totals.vab)} />
						<SummaryRow label="Semester" value={fmtHours(totals.vacation)} />
						<SummaryRow label="Tjänstledig" value={fmtHours(totals.leave)} />
						<div className="summary-row mt-4 font-semibold" style={{fontSize: '13px'}}>
							<span>Total bruttolön</span>
							<span className="num">{fmtMoney(totals.gross)} SEK</span>
						</div>
					</div>
				</section>

				{/* MAIN TABLE */}
				<section className="mb-3">
					<table>
						<colgroup>
							<col style={{width:"14%"}} />   {/* Datum */}
							<col style={{width:"32%"}} />  {/* Projekt */}
							<col style={{width:"26%"}} />  {/* Löneart */}
							<col style={{width:"10%"}} />   {/* Antal */}
							<col style={{width:"10%"}} />   {/* À-pris */}
							<col style={{width:"4%"}} />   {/* ⚠︎ */}
							<col style={{width:"10%"}} />  {/* Belopp */}
						</colgroup>
						<thead>
							<tr>
								<th>Datum</th><th>Projekt</th><th>Löneart</th>
								<th className="num">Antal tim</th>
								<th className="num">À-pris</th><th className="col-warn">⚠︎</th><th className="num">Belopp</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r, i) => (
								<tr key={i}>
									<td className="nowrap">{r.date}</td>
									<td className="truncate">{safe(r.project)}</td>
									<td className="truncate2">{r.wageItem}</td>
									<td className="num">{fmtQty(r.qty)}</td>
									<td className="num">{fmtMoney(r.unitPrice)}</td>
									<td className="col-warn">{r.hasWarning ? <span className="warn">⚠︎</span> : ""}</td>
									<td className={`num ${r.amount < 0 ? 'warn' : ''}`}>{fmtMoney(r.amount)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				{/* PROJECT SUBTOTALS + DEVIATIONS */}
				<section className="grid2 mb-3">
					<div className="card">
						<div className="text-sm font-semibold mb-1">Projektuppdelning</div>
						{projectSubtotals.length === 0 ? (
							<div className="muted">Inga projektregistreringar</div>
						) : (
							<table>
								<tbody>
									{projectSubtotals.map((p, i) => (
										<tr key={i}>
											<td className="truncate">{p.project}</td>
											<td className="num">{fmtMoney(p.sumAll)} SEK</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>

					<div className="card">
						<div className="text-sm font-semibold mb-1">Top 5 avvikande dagar</div>
						{topDeviations.length === 0 ? (
							<div className="muted">Inga avvikelser</div>
						) : (
							<table>
								<tbody>
									{topDeviations.map((d, i) => (
										<tr key={i}>
											<td>{d.date}</td>
											<td className="num">{fmtHours(d.hours)}</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</section>

				{/* ISSUES */}
				{issues.length > 0 && (
					<section className="card mb-3">
						<div className="text-sm font-semibold mb-1">
							<span className="warn">⚠︎</span> Kontrollista (Avvikelser)
						</div>
						<ul style={{margin:0, paddingLeft: "18px", listStyleType: "none"}}>
							{issues.map((x,i)=> (
								<li key={i} style={{textAlign: "left"}}>
									{x}
								</li>
							))}
						</ul>
					</section>
				)}

				{/* FOOTER */}
				<footer>
					<div>{meta.fileName ?? `loneunderlag_${meta.periodFrom}_${meta.periodTo}_${employee.name.replace(/\s+/g, '_')}.pdf`}</div>
					<div className="nowrap prose-num">Sida <span className="pageNumber"></span> av <span className="totalPages"></span></div>
				</footer>
			</body>
		</html>
	);
}

/* ---------- Helpers ---------- */

function fmtMoney(n: number): string {
	// Svensk format: 12 345,67 (negativa tal visas som (1 234,00) i röd)
	if (n < 0) {
		return `(${new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))})`;
	}
	return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtQty(n: number): string {
	return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtHours(decHours: number): string {
	const h = Math.floor(decHours);
	const m = Math.round((decHours - h) * 60);
	if (m === 0) {
		return `${h} h`;
	}
	return `${h} h ${m.toString().padStart(2, "0")} min`;
}

function safe(value?: string | null): string {
	if (!value) return "–";
	const trimmed = value.trim();
	return trimmed.length ? trimmed : "–";
}

function formatAttestation(value?: string): string {
	if (!value) return "–";
	const match = value.match(/(.+?)\s(\d{4}-\d{2}-\d{2})(?:\s\d{2}:\d{2})?$/);
	if (match) {
		const name = match[1].trim();
		const date = match[2];
		return `${name} ${date}`;
	}
	return value;
}

function SummaryRow({label, value}:{label:string; value:string}) {
	return (
		<div className="summary-row mb-1">
			<span>{label}</span><span className="num">{value}</span>
		</div>
	);
}

