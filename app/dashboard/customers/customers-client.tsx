"use client";

import { Plus, Search, ContactRound, Building2, User, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { type Customer } from '@/lib/schemas/customer';
import Link from 'next/link';

interface CustomersClientProps {
  customers: Customer[];
  canManageCustomers: boolean;
  search: string;
  type?: string;
  includeArchived: boolean;
}

export default function CustomersClient({ 
	customers, 
	canManageCustomers, 
	search, 
	type,
	includeArchived 
}: CustomersClientProps) {
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

  const handleTypeChange = (nextType: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextType === 'all') {
      params.delete('type');
    } else {
      params.set('type', nextType);
    }
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

  const getCustomerDisplayName = (customer: Customer) => {
    if (customer.type === 'COMPANY') {
      return customer.company_name || 'Okänt företag';
    } else {
      const firstName = customer.first_name || '';
      const lastName = customer.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'Okänd person';
    }
  };

  const getCustomerSubtitle = (customer: Customer) => {
    if (customer.type === 'COMPANY') {
      return customer.org_no ? `Org.nr: ${customer.org_no}` : null;
    } else {
      return customer.personal_identity_no ? `Personnr: ${customer.personal_identity_no}` : null;
    }
  };

  // Count customers by type
  const totalCustomers = customers.length;
  const companyCustomers = customers.filter((c) => c.type === 'COMPANY').length;
  const privateCustomers = customers.filter((c) => c.type === 'PRIVATE').length;
  const archivedCustomers = customers.filter((c) => c.is_archived).length;

  const typeOptions = [
    { key: 'all', label: 'Alla', count: totalCustomers },
    { key: 'COMPANY', label: 'Företag', count: companyCustomers },
    { key: 'PRIVATE', label: 'Privat', count: privateCustomers },
  ];

  return (
    <div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/70 bg-[var(--color-card)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-card)]/75 dark:border-black dark:bg-black dark:supports-[backdrop-filter]:bg-black/85">
        <div className="px-4 py-4 md:px-8 md:py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="mb-1 text-3xl font-bold text-foreground">Kunder</h1>
              <p className="text-sm text-muted-foreground">
                Hantera alla dina kunder
              </p>
            </div>
            {canManageCustomers && (
              <Button 
                onClick={() => router.push('/dashboard/customers/new')}
                className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200 bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Ny kund</span>
                <span className="md:hidden">Ny</span>
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="customer-search-input"
                placeholder="Sök kunder..."
                className="pl-9 border-border/60 bg-[var(--color-card)]/95 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-orange-500 dark:border-[#302015] dark:bg-black"
                defaultValue={search}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget as HTMLInputElement;
                    handleSearch(input.value);
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-border/70 bg-[var(--color-card)]/90 text-foreground transition-colors hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-500 dark:border-[#302015] dark:bg-black"
              onClick={() => {
                const input = document.getElementById('customer-search-input') as HTMLInputElement;
                if (input) {
                  handleSearch(input.value);
                }
              }}
            >
              Sök
            </Button>
            {search && (
              <Button 
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={clearSearch}
              >
                Rensa
              </Button>
            )}
            <Button
              variant={includeArchived ? "default" : "outline"}
              className="shrink-0 border-border/70 bg-[var(--color-card)]/90 text-foreground transition-colors hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-500 dark:border-[#302015] dark:bg-black"
              onClick={handleArchivedToggle}
            >
              <Archive className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Arkiverade</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {/* Type Filters */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          {typeOptions.map((option) => {
            const isActive = (type === option.key) || (option.key === 'all' && !type);
            return (
              <button
                key={option.key}
                onClick={() => handleTypeChange(option.key)}
                className={[
                  'relative flex flex-col gap-1 rounded-2xl border px-4 py-4 text-left transition-all duration-200',
                  'bg-[var(--color-card)]/90 text-foreground hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-orange-500/10',
                  'dark:bg-[var(--color-card)]/70 dark:text-white/90',
                  isActive
                    ? 'border-orange-500/70 shadow-lg shadow-orange-500/10 dark:border-orange-400/70'
                    : 'border-border/60 dark:border-border/40',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-xs font-semibold uppercase tracking-[0.28em]',
                    isActive ? 'text-orange-500 dark:text-orange-300' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {option.label}
                </span>
                <span className="text-2xl font-semibold">{option.count}</span>
              </button>
            );
          })}
        </div>

        {/* Customers List */}
        {customers && customers.length > 0 ? (
          <div className="space-y-4">
            {search ? (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">
                  Hittade {customers.length} {customers.length === 1 ? 'kund' : 'kunder'} som motsvarar din sökning &quot;{search}&quot;
                </h3>
              </div>
            ) : (
              <h3 className="text-lg font-semibold">
                {type === 'COMPANY' ? 'Företag' : type === 'PRIVATE' ? 'Privata kunder' : 'Alla kunder'}
              </h3>
            )}
            
            {customers.map((customer) => {
              const displayName = getCustomerDisplayName(customer);
              const subtitle = getCustomerSubtitle(customer);
              
              return (
                <Link
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-[var(--color-card)]/95 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-xl md:p-6 dark:border-border/40 dark:bg-[var(--color-card)]/80"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-orange-400/10" />
                  <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-3 flex items-start gap-3">
                        <div className="shrink-0 rounded-lg bg-orange-100/90 p-2 text-orange-600 shadow-sm dark:bg-orange-500/15 dark:text-orange-200">
                          {customer.type === 'COMPANY' ? (
                            <Building2 className="h-5 w-5" />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="mb-1 truncate text-lg font-semibold text-foreground">
                            {displayName}
                            {customer.is_archived && (
                              <span className="ml-2 text-xs text-muted-foreground">(Arkiverad)</span>
                            )}
                          </h4>
                          {subtitle && (
                            <p className="text-sm text-muted-foreground">{subtitle}</p>
                          )}
                          {customer.customer_no && (
                            <p className="text-sm text-muted-foreground">Kundnr: {customer.customer_no}</p>
                          )}
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {customer.invoice_email && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">E-post: {customer.invoice_email}</span>
                          </div>
                        )}
                        {customer.type === 'COMPANY' && customer.rot_enabled && (
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                              ROT
                            </span>
                          </div>
                        )}
                        {customer.type === 'PRIVATE' && customer.rot_enabled && (
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                              Privat ROT
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-3 md:flex-col md:items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border/70 bg-[var(--color-card)]/90 text-foreground transition-all duration-200 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-500 dark:border-border/40 dark:bg-[var(--color-card)]/70"
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/dashboard/customers/${customer.id}`);
                        }}
                      >
                        Öppna
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-[var(--color-card)]/95 p-12 text-center shadow-sm dark:border-border/40 dark:bg-[var(--color-card)]/80">
            <ContactRound className="mx-auto mb-4 h-12 w-12 text-muted-foreground/80" />
            {search ? (
              <>
                <h3 className="mb-2 text-lg font-semibold">
                  Inga kunder hittades för &quot;{search}&quot;
                </h3>
                <p className="mb-4 text-muted-foreground">
                  Prova att söka på något annat eller rensa sökningen
                </p>
                <Button 
                  variant="outline"
                  className="border-border/70 bg-[var(--color-card)]/90 hover:border-orange-500/40 hover:bg-orange-500/10 dark:border-border/40 dark:bg-[var(--color-card)]/70"
                  onClick={clearSearch}
                >
                  Rensa sökning
                </Button>
              </>
            ) : (
              <>
                <p className="mb-4 text-muted-foreground">
                  {includeArchived ? 'Inga kunder hittades med dessa filter' : 'Du har inga kunder än'}
                </p>
                {canManageCustomers && (
                  <Button 
                    onClick={() => router.push('/dashboard/customers/new')}
                    className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Skapa din första kund
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

