'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface FortnoxCustomerImportProps {
	orgId: string;
}

interface FortnoxCustomer {
	CustomerNumber: string;
	Name: string;
	Email?: string;
	EmailInvoice?: string;
	OrganisationNumber?: string;
	City?: string;
	Active?: boolean;
}

interface ImportResult {
	imported: number;
	skipped: number;
	skippedArchived?: number; // Optional for backwards compatibility
	errors: Array<{ customerNumber: string; error: string }>;
}

export function FortnoxCustomerImport({ orgId }: FortnoxCustomerImportProps) {
	const queryClient = useQueryClient();
	const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

	// Fetch customers from Fortnox
	const [shouldFetch, setShouldFetch] = useState(false);
	
	const {
		data: customers,
		isLoading: isLoadingCustomers,
		error: customersError,
		refetch: refetchCustomers,
	} = useQuery<FortnoxCustomer[]>({
		queryKey: ['fortnox-customers', orgId],
		queryFn: async () => {
			const response = await fetch(`/api/integrations/fortnox/customers?limit=500`);
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error('Fortnox-anslutning saknas. Anslut ditt Fortnox-konto först.');
				}
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte hämta kunder från Fortnox');
			}
			const data = await response.json();
			return data.customers || [];
		},
		enabled: shouldFetch, // Only fetch when user clicks "Hämta kunder"
		retry: 1,
		retryDelay: 1000,
	});

	const handleFetchCustomers = () => {
		setShouldFetch(true);
		refetchCustomers();
	};

	// Import customers
	const importMutation = useMutation<{ success: boolean; results: ImportResult; message: string }>({
		mutationFn: async () => {
			if (selectedCustomers.size === 0) {
				throw new Error('Välj minst en kund att importera');
			}

			const response = await fetch('/api/integrations/fortnox/customers/import', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					customerNumbers: Array.from(selectedCustomers),
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte importera kunder');
			}

			return response.json();
		},
		onSuccess: (data) => {
			toast.success(data.message || 'Kunder importerade!');
			setSelectedCustomers(new Set());
			queryClient.invalidateQueries({ queryKey: ['customers'] });
			refetchCustomers();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte importera kunder');
		},
	});

	const handleSelectAll = () => {
		if (!customers) return;
		if (selectedCustomers.size === customers.length) {
			setSelectedCustomers(new Set());
		} else {
			setSelectedCustomers(new Set(customers.map((c) => c.CustomerNumber)));
		}
	};

	const handleSelectCustomer = (customerNumber: string) => {
		const newSelected = new Set(selectedCustomers);
		if (newSelected.has(customerNumber)) {
			newSelected.delete(customerNumber);
		} else {
			newSelected.add(customerNumber);
		}
		setSelectedCustomers(newSelected);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Importera kunder från Fortnox</CardTitle>
				<CardDescription>
					Hämta och importera kunder från ditt Fortnox-konto till EP-Tracker. Befintliga kunder
					hoppas över automatiskt.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!customers && !isLoadingCustomers && !customersError && (
					<div className="flex flex-col gap-4">
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								Klicka på "Hämta kunder" för att ladda ner kundlistan från Fortnox. Du kan sedan
								välja vilka kunder som ska importeras.
							</AlertDescription>
						</Alert>
						<Button
							onClick={handleFetchCustomers}
							disabled={isLoadingCustomers}
							className="w-full"
						>
							{isLoadingCustomers ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Hämtar kunder...
								</>
							) : (
								<>
									<Download className="w-4 h-4 mr-2" />
									Hämta kunder från Fortnox
								</>
							)}
						</Button>
					</div>
				)}

				{customersError && (
					<Alert variant="destructive">
						<XCircle className="h-4 w-4" />
						<AlertDescription>
							{customersError instanceof Error
								? customersError.message
								: 'Kunde inte hämta kunder från Fortnox'}
						</AlertDescription>
					</Alert>
				)}

				{isLoadingCustomers && (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				)}

				{customers && customers.length > 0 && (
					<>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Checkbox
									checked={selectedCustomers.size === customers.length}
									onCheckedChange={handleSelectAll}
								/>
								<span className="text-sm font-medium">
									Välj alla ({selectedCustomers.size} av {customers.length} valda)
								</span>
							</div>
							<Button
								onClick={handleFetchCustomers}
								variant="outline"
								size="sm"
								disabled={isLoadingCustomers}
							>
								{isLoadingCustomers ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									'Uppdatera lista'
								)}
							</Button>
						</div>

						<div className="max-h-96 overflow-y-auto border rounded-lg">
							<div className="divide-y">
								{customers.map((customer) => {
									const isSelected = selectedCustomers.has(customer.CustomerNumber);
									return (
										<div
											key={customer.CustomerNumber}
											className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
											onClick={() => handleSelectCustomer(customer.CustomerNumber)}
										>
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => handleSelectCustomer(customer.CustomerNumber)}
												onClick={(e) => e.stopPropagation()}
											/>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<p className="font-medium truncate">{customer.Name}</p>
													{customer.Active === false && (
														<Badge variant="secondary" className="text-xs">
															Inaktiv
														</Badge>
													)}
												</div>
												<div className="flex items-center gap-4 text-sm text-muted-foreground">
													<span>Kundnr: {customer.CustomerNumber}</span>
													{customer.OrganisationNumber && (
														<span>
															{/* For PRIVATE customers, OrganisationNumber is actually personal identity number */}
															{(customer.Type === 'PRIVATE' || !customer.Type) && customer.OrganisationNumber.match(/^\d{8}-\d{4}$/)
																? 'Personnummer'
																: 'Org.nr'}: {customer.OrganisationNumber}
														</span>
													)}
													{customer.City && <span>{customer.City}</span>}
												</div>
												{(customer.Email || customer.EmailInvoice) && (
													<p className="text-xs text-muted-foreground truncate">
														{customer.EmailInvoice || customer.Email}
													</p>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="flex items-center justify-between pt-4 border-t">
							<div className="text-sm text-muted-foreground">
								{selectedCustomers.size > 0
									? `${selectedCustomers.size} kund${selectedCustomers.size > 1 ? 'er' : ''} vald${selectedCustomers.size > 1 ? 'a' : ''} för import`
									: 'Välj kunder att importera'}
							</div>
							<Button
								onClick={() => importMutation.mutate()}
								disabled={selectedCustomers.size === 0 || importMutation.isPending}
							>
								{importMutation.isPending ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Importerar...
									</>
								) : (
									<>
										<Download className="w-4 h-4 mr-2" />
										Importera valda kunder ({selectedCustomers.size})
									</>
								)}
							</Button>
						</div>

						{importMutation.data && (
							<Alert
								variant={
									importMutation.data.results.imported > 0 && importMutation.data.results.errors.length === 0
										? 'default'
										: importMutation.data.results.errors.length > 0
										? 'destructive'
										: 'default'
								}
							>
								{importMutation.data.results.imported > 0 && importMutation.data.results.errors.length === 0 ? (
									<CheckCircle2 className="h-4 w-4 text-green-600" />
								) : (
									<AlertCircle className="h-4 w-4" />
								)}
								<AlertDescription>
									<div className="space-y-2">
										{importMutation.data.results.imported > 0 && (
											<div className="flex items-center gap-2">
												<CheckCircle2 className="h-5 w-5 text-green-600" />
												<p className="font-semibold text-green-600">
													✅ {importMutation.data.results.imported} kund{importMutation.data.results.imported > 1 ? 'er' : ''} importerade till EP-Tracker!
												</p>
											</div>
										)}
										{importMutation.data.results.skipped > 0 && (
											<div className="text-sm text-muted-foreground">
												<p>
													{importMutation.data.results.skipped} kund{importMutation.data.results.skipped > 1 ? 'er' : ''} hoppades över (fanns redan)
												</p>
												{importMutation.data.results.skippedArchived && importMutation.data.results.skippedArchived > 0 && (
													<p className="mt-1 text-amber-600 font-medium">
														⚠️ {importMutation.data.results.skippedArchived} av dessa är arkiverade och syns inte i standardlistan. 
														Visa arkiverade kunder i <Link href="/dashboard/customers?includeArchived=true" className="underline">Kunder-sektionen</Link>.
													</p>
												)}
											</div>
										)}
										{importMutation.data.results.errors.length > 0 && (
											<div className="mt-2">
												<p className="text-sm font-medium text-destructive">Fel vid import ({importMutation.data.results.errors.length}):</p>
												<ul className="list-disc list-inside text-sm mt-1 space-y-1">
													{importMutation.data.results.errors.map((error, idx) => (
														<li key={idx} className="text-destructive">
															Kund {error.customerNumber}: {error.error}
														</li>
													))}
												</ul>
											</div>
										)}
										{importMutation.data.results.imported > 0 && (
											<div className="mt-3 pt-3 border-t">
												<Link href="/dashboard/customers">
													<Button variant="outline" size="sm" className="w-full">
														Visa importerade kunder i EP-Tracker
													</Button>
												</Link>
											</div>
										)}
									</div>
								</AlertDescription>
							</Alert>
						)}
					</>
				)}

				{customers && customers.length === 0 && (
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Inga nya kunder att importera. Alla kunder från Fortnox finns redan i EP-Tracker, eller så saknas kunder i ditt Fortnox-konto.
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
		</Card>
	);
}

