'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ExportPreviewDialogProps {
	exportType: 'salary' | 'invoice';
	periodStart: Date;
	periodEnd: Date;
	children: React.ReactNode;
}

interface PreviewData {
	summary: {
		totalTimeEntries: number;
		totalMaterials: number;
		totalExpenses: number;
		totalMileage: number;
		totalAmount: number;
	};
	preview: string[][]; // First 20 rows of CSV data
	headers: string[];
}

export function ExportPreviewDialog({
	exportType,
	periodStart,
	periodEnd,
	children,
}: ExportPreviewDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [previewData, setPreviewData] = useState<PreviewData | null>(null);
	const [downloading, setDownloading] = useState(false);

	async function loadPreview() {
		try {
			setLoading(true);
			const startStr = periodStart.toISOString().split('T')[0];
			const endStr = periodEnd.toISOString().split('T')[0];

			const response = await fetch(
				`/api/exports/${exportType}/preview?start=${startStr}&end=${endStr}`
			);

			if (!response.ok) {
				throw new Error('Failed to load preview');
			}

			const data = await response.json();
			setPreviewData(data);
		} catch (error) {
			console.error('Error loading preview:', error);
			toast.error('Kunde inte ladda förhandsgranskning');
		} finally {
			setLoading(false);
		}
	}

	async function handleDownload() {
		try {
			setDownloading(true);
			const startStr = periodStart.toISOString().split('T')[0];
			const endStr = periodEnd.toISOString().split('T')[0];

			const response = await fetch(
				`/api/exports/${exportType}?start=${startStr}&end=${endStr}`
			);

			if (!response.ok) {
				throw new Error('Failed to download export');
			}

			// Get filename from header or generate
			const contentDisposition = response.headers.get('Content-Disposition');
			const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
			const filename = filenameMatch?.[1] || `export_${exportType}_${startStr}_${endStr}.csv`;

			// Download file
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success('Export nedladdad!');
			setOpen(false);
		} catch (error) {
			console.error('Error downloading export:', error);
			toast.error('Kunde inte ladda ner export');
		} finally {
			setDownloading(false);
		}
	}

	function handleOpenChange(newOpen: boolean) {
		setOpen(newOpen);
		if (newOpen && !previewData) {
			loadPreview();
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				{children}
			</DialogTrigger>
			<DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Förhandsgranska Export
					</DialogTitle>
					<DialogDescription>
						{exportType === 'salary' ? 'Löne-CSV' : 'Faktura-CSV'} för perioden{' '}
						{periodStart.toLocaleDateString('sv-SE')} - {periodEnd.toLocaleDateString('sv-SE')}
					</DialogDescription>
				</DialogHeader>

				{loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : previewData ? (
					<div className="space-y-4">
						{/* Summary Card */}
						<Card className="p-4">
							<h3 className="font-semibold mb-3">Sammanfattning</h3>
							<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
								<div>
									<p className="text-sm text-muted-foreground">Tidrapporter</p>
									<p className="text-2xl font-bold">{previewData.summary.totalTimeEntries}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Material</p>
									<p className="text-2xl font-bold">{previewData.summary.totalMaterials}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Utlägg</p>
									<p className="text-2xl font-bold">{previewData.summary.totalExpenses}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Milersättning</p>
									<p className="text-2xl font-bold">{previewData.summary.totalMileage}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Totalt belopp</p>
									<p className="text-2xl font-bold">
										{previewData.summary.totalAmount.toLocaleString('sv-SE')} kr
									</p>
								</div>
							</div>
						</Card>

						{/* Preview Table */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<h3 className="font-semibold">Förhandsgranskning (första 20 raderna)</h3>
								<Badge variant="secondary">
									{previewData.preview.length} / {previewData.summary.totalTimeEntries + previewData.summary.totalMaterials + previewData.summary.totalExpenses + previewData.summary.totalMileage} rader
								</Badge>
							</div>
							<div className="border rounded-lg overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-muted">
											<tr>
												{previewData.headers.map((header, i) => (
													<th
														key={i}
														className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
													>
														{header}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{previewData.preview.map((row, i) => (
												<tr key={i} className="border-t hover:bg-muted/50">
													{row.map((cell, j) => (
														<td
															key={j}
															className="px-3 py-2 whitespace-nowrap"
														>
															{cell}
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
							{previewData.preview.length < (previewData.summary.totalTimeEntries + previewData.summary.totalMaterials + previewData.summary.totalExpenses + previewData.summary.totalMileage) && (
								<p className="text-sm text-muted-foreground mt-2">
									... och {(previewData.summary.totalTimeEntries + previewData.summary.totalMaterials + previewData.summary.totalExpenses + previewData.summary.totalMileage) - previewData.preview.length} rader till
								</p>
							)}
						</div>

						{/* Download Button */}
						<div className="flex justify-end gap-2 pt-4">
							<Button variant="outline" onClick={() => setOpen(false)}>
								Avbryt
							</Button>
							<Button onClick={handleDownload} disabled={downloading}>
								{downloading ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Laddar ner...
									</>
								) : (
									<>
										<Download className="h-4 w-4 mr-2" />
										Ladda ner CSV
									</>
								)}
							</Button>
						</div>
					</div>
				) : (
					<div className="text-center py-12">
						<p className="text-muted-foreground">Kunde inte ladda förhandsgranskning</p>
						<Button onClick={loadPreview} className="mt-4">
							Försök igen
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

