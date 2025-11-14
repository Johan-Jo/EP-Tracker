'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, Building2, User2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
	type Customer,
	type CustomerPayload,
} from '@/lib/schemas/customer';
import {
	useCreateCustomer,
	useCustomers,
} from '@/lib/hooks/use-customers';
import { CustomerForm } from './customer-form';

type CustomerSelectProps = {
	value?: Customer | null;
	onChange: (customer: Customer) => void;
	label?: string;
	placeholder?: string;
	allowCreate?: boolean;
};

const displayCustomerName = (customer: Customer) =>
	customer.type === 'COMPANY'
		? customer.company_name ?? 'Namnlös kund'
		: `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() ||
			'Namnlös kund';

const SummaryLine = ({ customer }: { customer: Customer }) => (
	<div className="text-xs text-muted-foreground space-x-2">
		<span>{customer.customer_no}</span>
		{customer.type === 'COMPANY' && customer.org_no ? (
			<span>{customer.org_no}</span>
		) : null}
		{customer.type === 'PRIVATE' && customer.personal_identity_no ? (
			<span>{customer.personal_identity_no}</span>
		) : null}
		{customer.invoice_email ? <span>{customer.invoice_email}</span> : null}
	</div>
);

export function CustomerSelect({
	value,
	onChange,
	label,
	placeholder = 'Välj kund',
	allowCreate = true,
}: CustomerSelectProps) {
	const [open, setOpen] = useState(false);
	const [showCreate, setShowCreate] = useState(false);
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [page, setPage] = useState(1);
	const pageSize = 10;

	useEffect(() => {
		const id = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 250);

		return () => clearTimeout(id);
	}, [search]);

	const {
		data,
		isLoading,
		isFetching,
		error,
	} = useCustomers({
		query: debouncedSearch,
		page,
		pageSize,
		includeArchived: false,
	});
	const createCustomerMutation = useCreateCustomer();

	const hasMore =
		data?.total && data.total > page * (data.pageSize ?? pageSize);

	const handleSelect = (customer: Customer) => {
		onChange(customer);
		setOpen(false);
		setShowCreate(false);
	};

	const handleCreate = async (payload: CustomerPayload) => {
		const customer = await createCustomerMutation.mutateAsync(payload);
		handleSelect(customer);
	};

	const triggerLabel = useMemo(() => {
		if (!value) {
			return placeholder;
		}
		return displayCustomerName(value);
	}, [placeholder, value]);

	return (
		<div className="space-y-2">
			{label ? <Label>{label}</Label> : null}
			<Button
				type="button"
				variant="outline"
				className="w-full justify-between"
				onClick={() => setOpen(true)}
			>
				<span className="truncate">{triggerLabel}</span>
				<Search className="h-4 w-4 opacity-70" />
			</Button>
			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen);
					if (!nextOpen) {
						setShowCreate(false);
					}
				}}
			>
				<DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
					<DialogHeader className="flex-shrink-0">
						<DialogTitle>Välj kund</DialogTitle>
						<DialogDescription>
							Sök efter befintlig kund eller skapa en ny kund direkt.
						</DialogDescription>
					</DialogHeader>
					<div className="flex-1 overflow-y-auto min-h-0">
						{showCreate ? (
							<CustomerForm
								onSubmit={handleCreate}
								onCancel={() => setShowCreate(false)}
								submitLabel="Skapa kund"
							/>
						) : (
						<div className="space-y-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										placeholder="Sök på namn, kundnummer, orgnr eller personnummer"
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										className="pl-9"
										autoFocus
									/>
								</div>
								{allowCreate ? (
									<Button
										type="button"
										variant="default"
										onClick={() => setShowCreate(true)}
									>
										<Plus className="mr-2 h-4 w-4" />
										Ny kund
									</Button>
								) : null}
							</div>

							<div className="relative min-h-[260px]">
								{error ? (
									<div className="flex h-48 flex-col items-center justify-center space-y-2 text-center text-sm text-destructive">
										<p>Kunde inte ladda kunder.</p>
										<p className="text-xs text-muted-foreground">
											{error instanceof Error ? error.message : 'Serverfel'}
										</p>
									</div>
								) : isLoading ? (
									<div className="flex h-48 items-center justify-center">
										<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
									</div>
								) : (
									<div className="h-64 overflow-y-auto rounded-md border divide-y">
										{data?.items?.length ? (
											data.items.map((customer) => {
												const Icon =
													customer.type === 'COMPANY'
														? Building2
														: User2;
												return (
													<button
														type="button"
														key={customer.id}
														className={cn(
															'w-full px-4 py-3 text-left hover:bg-muted focus:outline-none focus-visible:ring',
															value?.id === customer.id ? 'bg-muted' : ''
														)}
														onClick={() => handleSelect(customer)}
													>
														<div className="flex items-start gap-3">
															<div className="mt-1 rounded-full bg-muted px-2 py-2">
																<Icon className="h-4 w-4 text-muted-foreground" />
															</div>
															<div className="flex-1">
																<p className="font-medium">
																	{displayCustomerName(customer)}
																</p>
																<SummaryLine customer={customer} />
															</div>
														</div>
													</button>
												);
											})
										) : (
											<div className="flex h-48 flex-col items-center justify-center space-y-2 text-center text-sm text-muted-foreground">
												<p>Inga kunder matchar din sökning.</p>
												{allowCreate ? (
													<Button
														variant="outline"
														onClick={() => setShowCreate(true)}
													>
														<Plus className="mr-2 h-4 w-4" />
														Skapa ny kund
													</Button>
												) : null}
											</div>
										)}
									</div>
								)}
								{isFetching && !isLoading ? (
									<div className="absolute inset-x-0 bottom-2 flex justify-center">
										<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
									</div>
								) : null}
							</div>

							{data?.items?.length ? (
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>
										Visar {data.items.length} av {data.total} kunder
									</span>
									<div className="space-x-2">
										<Button
											type="button"
											variant="outline"
											disabled={page === 1 || isFetching}
											onClick={() => setPage((prev) => Math.max(1, prev - 1))}
										>
											Föregående
										</Button>
										<Button
											type="button"
											variant="outline"
											disabled={!hasMore || isFetching}
											onClick={() => setPage((prev) => prev + 1)}
										>
											Nästa
										</Button>
									</div>
								</div>
							) : null}
						</div>
					)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}


