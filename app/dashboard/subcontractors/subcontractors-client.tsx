'use client';

import { Plus, Search, Building2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { type Subcontractor } from '@/lib/schemas/subcontractor';
import Link from 'next/link';
import { formatSwedishOrganizationNumber } from '@/lib/utils/swedish';

interface SubcontractorsClientProps {
	subcontractors: Subcontractor[];
	canManageSubcontractors: boolean;
	search: string;
	includeArchived: boolean;
}

export default function SubcontractorsClient({
	subcontractors,
	canManageSubcontractors,
	search,
	includeArchived,
}: SubcontractorsClientProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const handleSearch = (searchValue: string) => {
		const params = new URLSearchParams(searchParams.toString());

		if (searchValue && searchValue.trim()) {
			params.set('search', searchValue.trim());
		} else {
			params.delete('search');
		}

		const newUrl = `${pathname}?${params.toString()}`;
		router.push(newUrl);
	};

	const clearSearch = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete('search');

		const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
		router.push(newUrl);
	};

	const handleArchivedToggle = () => {
		const params = new URLSearchParams(searchParams.toString());
		if (includeArchived) {
			params.delete('includeArchived');
		} else {
			params.set('includeArchived', 'true');
		}
		const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
		router.push(newUrl);
	};

	const totalSubcontractors = subcontractors.length;
	const archivedSubcontractors = subcontractors.filter((s) => s.is_archived).length;

	return (
		<div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
			{/* Header */}
			<header className="sticky top-0 z-10 border-b border-border/70 bg-[var(--color-card)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-card)]/75 dark:border-black dark:bg-black dark:supports-[backdrop-filter]:bg-black/85">
				<div className="px-4 py-4 md:px-8 md:py-6">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<h1 className="mb-1 text-3xl font-bold text-foreground">
								Underentreprenörer
							</h1>
							<p className="text-sm text-muted-foreground">
								Hantera alla dina underentreprenörer (UE)
							</p>
						</div>
						{canManageSubcontractors && (
							<Button
								onClick={() => router.push('/dashboard/subcontractors/new')}
								className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200 bg-orange-500 hover:bg-orange-600"
							>
								<Plus className="mr-2 h-4 w-4" />
								Ny underentreprenör
							</Button>
						)}
					</div>

					{/* Search and filters */}
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div className="relative flex-1 max-w-md">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Sök efter företagsnamn, organisationsnummer, e-post..."
								value={search}
								onChange={(e) => handleSearch(e.target.value)}
								className="pl-10"
							/>
							{search && (
								<Button
									variant="ghost"
									size="sm"
									onClick={clearSearch}
									className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
								>
									Rensa
								</Button>
							)}
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant={includeArchived ? 'default' : 'outline'}
								size="sm"
								onClick={handleArchivedToggle}
							>
								<Archive className="mr-2 h-4 w-4" />
								{includeArchived ? 'Dölj arkiverade' : 'Visa arkiverade'}
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Content */}
			<main className="p-4 md:p-8">
				{/* Stats */}
				<div className="mb-6 grid gap-4 md:grid-cols-3">
					<div className="rounded-lg border bg-card p-4">
						<div className="text-sm font-medium text-muted-foreground">
							Totalt antal
						</div>
						<div className="mt-1 text-2xl font-bold">{totalSubcontractors}</div>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="text-sm font-medium text-muted-foreground">Aktiva</div>
						<div className="mt-1 text-2xl font-bold">
							{totalSubcontractors - archivedSubcontractors}
						</div>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="text-sm font-medium text-muted-foreground">Arkiverade</div>
						<div className="mt-1 text-2xl font-bold">{archivedSubcontractors}</div>
					</div>
				</div>

				{/* List */}
				{subcontractors.length === 0 ? (
					<div className="rounded-lg border bg-card p-8 text-center">
						<Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
						<h3 className="mt-4 text-lg font-semibold">Inga underentreprenörer</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							{search
								? 'Inga resultat hittades för din sökning.'
								: 'Börja med att lägga till en underentreprenör.'}
						</p>
						{canManageSubcontractors && !search && (
							<Button
								onClick={() => router.push('/dashboard/subcontractors/new')}
								className="mt-4"
							>
								<Plus className="mr-2 h-4 w-4" />
								Lägg till underentreprenör
							</Button>
						)}
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{subcontractors.map((subcontractor) => (
							<Link
								key={subcontractor.id}
								href={`/dashboard/subcontractors/${subcontractor.id}`}
								className="rounded-lg border bg-card p-4 transition-all hover:shadow-md"
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<h3 className="font-semibold">{subcontractor.company_name}</h3>
										<p className="mt-1 text-sm text-muted-foreground">
											{subcontractor.subcontractor_no}
										</p>
										{subcontractor.org_no && (
											<p className="mt-1 text-sm text-muted-foreground">
												{formatSwedishOrganizationNumber(subcontractor.org_no)}
											</p>
										)}
										{subcontractor.contact_person_name && (
											<p className="mt-1 text-sm text-muted-foreground">
												Kontakt: {subcontractor.contact_person_name}
											</p>
										)}
									</div>
									{subcontractor.is_archived && (
										<span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300">
											Arkiverad
										</span>
									)}
								</div>
							</Link>
						))}
					</div>
				)}
			</main>
		</div>
	);
}

