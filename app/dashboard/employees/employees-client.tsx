'use client';

import { useState } from 'react';
import { Plus, Search, User, Archive, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { type Employee } from '@/lib/schemas/employee';
import Link from 'next/link';
import { FortnoxIntegrationSteps } from '@/components/employees/fortnox-integration-steps';
import { toast } from 'sonner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface EmployeesClientProps {
	employees: Employee[];
	canManageEmployees: boolean;
	search: string;
	includeArchived: boolean;
	hasFortnoxConnection: boolean;
	hasPayrollScope?: boolean;
	orgId: string;
	fortnoxMappings?: Map<string, string>; // Map: employee.id -> fortnox_employee_id
}

export default function EmployeesClient({ 
	employees, 
	canManageEmployees, 
	search, 
	includeArchived,
	hasFortnoxConnection,
	hasPayrollScope,
	orgId,
	fortnoxMappings = new Map<string, string>(),
}: EmployeesClientProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isImporting, setIsImporting] = useState(false);
	const [lastImportAt, setLastImportAt] = useState<string | null>(null);
	const [lastImportSummary, setLastImportSummary] = useState<{
		created: number;
		updated: number;
		conflicts: number;
	} | null>(null);
	const [syncError, setSyncError] = useState<{ code?: string; message?: string } | null>(null);

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

  const getEmployeeDisplayName = (employee: Employee) => {
    const firstName = employee.first_name || '';
    const lastName = employee.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Okänd person';
  };

  const getEmployeeSubtitle = (employee: Employee) => {
    const parts: string[] = [];
    
    // Always show internal employee_no if it exists
    if (employee.employee_no) {
      parts.push(`Personalnr: ${employee.employee_no}`);
    }
    
    // Show Fortnox EmployeeId separately if it exists and differs from internal number
    const fortnoxEmployeeId = fortnoxMappings.get(employee.id);
    if (fortnoxEmployeeId && fortnoxEmployeeId !== employee.employee_no) {
      parts.push(`Fortnox ID: ${fortnoxEmployeeId}`);
    }
    
    if (employee.employment_type) {
      const typeLabels: Record<string, string> = {
        FULL_TIME: 'Heltid',
        PART_TIME: 'Deltid',
        CONTRACTOR: 'Konsult',
        TEMPORARY: 'Temporär',
      };
      parts.push(typeLabels[employee.employment_type] || employee.employment_type);
    }
    return parts.length > 0 ? parts.join(' • ') : null;
  };

	const handleConnectClick = () => {
		router.push('/dashboard/settings/fortnox');
	};

	type ApiError = {
		error?: string;
		code?: string;
		message?: string;
		httpStatus?: number;
		fortnoxCode?: number | string;
		details?: {
			fortnoxMessage?: string;
			fortnoxCode?: number | string;
			httpStatus?: number;
		};
	};

	const handleImportClick = async () => {
		if (!hasFortnoxConnection) {
			toast.error('Fortnox-anslutning saknas. Koppla Fortnox först.');
			return;
		}

		setIsImporting(true);
		setSyncError(null);
		toast.loading('Importerar anställda från Fortnox...', { id: 'fortnox-import' });

		try {
			const response = await fetch('/api/integrations/fortnox/employees/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});

			if (!response.ok) {
				let body: ApiError | null = null;
				try {
					body = await response.json();
				} catch {
					// ignore
				}

				const errorCode = body?.code || body?.error;
				
				// For permission errors (403), show dedicated Alert component
				if (response.status === 403 && errorCode === 'FORTNOX_PERMISSION_MISSING') {
					setSyncError({ 
						code: 'FORTNOX_PERMISSION_MISSING', 
						message: body?.message || 'Behörighet saknas i Fortnox för att läsa anställda.',
					});
					toast.dismiss('fortnox-import');
					return;
				}

				// For legacy NO_EMPLOYEE_ACCESS, show the Alert component (via syncError state)
				if (errorCode === 'NO_EMPLOYEE_ACCESS') {
					setSyncError({ code: errorCode, message: body?.message });
					toast.dismiss('fortnox-import');
					return;
				}

				// For integration errors (502) or other errors, show toast with retry option
				const error: any = new Error(
					body?.message || 'Kunde inte synka anställda från Fortnox.'
				);
				error.code = errorCode;
				error.httpStatus = response.status;
				error.fortnoxCode = body?.fortnoxCode || body?.details?.fortnoxCode;
				throw error;
			}

			const result = await response.json();

			setLastImportAt(new Date().toISOString());
			if (result.summary) {
				setLastImportSummary({
					created: result.summary.created || 0,
					updated: result.summary.updated || 0,
					conflicts: result.summary.conflicts || 0,
				});
			}

			toast.success(
				result.message || `Importerade ${result.summary?.created || 0} nya anställda`,
				{ id: 'fortnox-import' }
			);

			// Refresh the page to show new employees
			router.refresh();
		} catch (err) {
			console.error('Fortnox import error:', err);
			const error = err as any;
			
			// Show appropriate error message based on error type
			if (error.httpStatus >= 500 || error.code === 'FORTNOX_INTEGRATION_ERROR') {
				toast.error(
					'Ett tekniskt fel uppstod vid kommunikation med Fortnox. Försök igen om en stund.',
					{ 
						id: 'fortnox-import',
						duration: 10000,
					}
				);
			} else {
				toast.error(
					error.message || 'Import misslyckades',
					{ id: 'fortnox-import' }
				);
			}
		} finally {
			setIsImporting(false);
		}
	};

	const totalEmployees = employees.length;
	const archivedEmployees = employees.filter((e) => e.is_archived).length;

  return (
    <div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/70 bg-[var(--color-card)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-card)]/75 dark:border-black dark:bg-black dark:supports-[backdrop-filter]:bg-black/85">
        <div className="px-4 py-4 md:px-8 md:py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="mb-1 text-3xl font-bold text-foreground">Personal</h1>
              <p className="text-sm text-muted-foreground">
                Hantera alla dina anställda
              </p>
            </div>
            {canManageEmployees && (
              <Button 
                onClick={() => router.push('/dashboard/employees/new')}
                className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200 bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Ny personal</span>
                <span className="md:hidden">Ny</span>
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="employee-search-input"
                placeholder="Sök personal..."
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
                const input = document.getElementById('employee-search-input') as HTMLInputElement;
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
			<main className='mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8'>
				{/* Fortnox Integration Steps */}
				{canManageEmployees && (
					<>
						<FortnoxIntegrationSteps
							hasFortnoxConnection={hasFortnoxConnection}
							hasPayrollScope={hasPayrollScope}
							lastImportAt={lastImportAt}
							lastImportSummary={lastImportSummary}
							isImporting={isImporting}
							onConnectClick={handleConnectClick}
							onImportClick={handleImportClick}
							settingsHref='/dashboard/settings/fortnox'
						/>
						
						{(syncError as any)?.code === 'FORTNOX_PERMISSION_MISSING' && (
							<Alert variant="destructive" className="mt-4">
								<AlertTitle>Behörighet saknas i Fortnox</AlertTitle>
								<AlertDescription className="space-y-2">
									<p className="font-medium">{syncError?.message}</p>
									<p>Fortnox säger att du saknar behörighet att läsa anställda. Be din Fortnox-administratör att:</p>
									<ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
										<li>Öppna Fortnox och gå till <b>Administrera användare / integrationer</b>.</li>
										<li>Kontrollera att användaren/integrationen som används för EP-Tracker har rätt behörigheter för <b>Personal/Lön</b> och åtkomst till <b>Anställda</b>.</li>
										<li>Spara och försök igen härifrån.</li>
									</ol>
								</AlertDescription>
							</Alert>
						)}
						{(syncError as any)?.code === 'NO_EMPLOYEE_ACCESS' && (
							<Alert variant="destructive" className="mt-4">
								<AlertTitle>Ingen behörighet att läsa anställda i Fortnox</AlertTitle>
								<AlertDescription>
									För att kunna importera anställda från Fortnox behöver du:
									<ol className="list-decimal list-inside mt-2 space-y-1">
										<li>Kontrollera att <b>Lön-modulen</b> är aktiverad på ditt Fortnox-konto.</li>
										<li>Säkerställ att den användare som kopplade integrationen har <b>behörighet att läsa anställda</b> i Fortnox.</li>
										<li>Gör om kopplingen eller prova att synka igen härifrån.</li>
									</ol>
								</AlertDescription>
							</Alert>
						)}
					</>
				)}

				{/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="relative flex flex-col gap-1 rounded-2xl border border-border/60 bg-[var(--color-card)]/90 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-orange-500/10 dark:bg-[var(--color-card)]/70">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Totalt
            </span>
            <span className="text-2xl font-semibold">{totalEmployees}</span>
          </div>
          <div className="relative flex flex-col gap-1 rounded-2xl border border-border/60 bg-[var(--color-card)]/90 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-orange-500/10 dark:bg-[var(--color-card)]/70">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Arkiverade
            </span>
            <span className="text-2xl font-semibold">{archivedEmployees}</span>
          </div>
        </div>

        {/* Employees List */}
        {employees && employees.length > 0 ? (
          <div className="space-y-4">
            {search ? (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">
                  Hittade {employees.length} {employees.length === 1 ? 'person' : 'personer'} som motsvarar din sökning &quot;{search}&quot;
                </h3>
              </div>
            ) : (
              <h3 className="text-lg font-semibold">
                Alla personal
              </h3>
            )}
            
            {employees.map((employee) => {
              const displayName = getEmployeeDisplayName(employee);
              const subtitle = getEmployeeSubtitle(employee);
              
              return (
                <Link
                  key={employee.id}
                  href={`/dashboard/employees/${employee.id}`}
                  className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-[var(--color-card)]/95 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-xl md:p-6 dark:border-border/40 dark:bg-[var(--color-card)]/80"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-orange-400/10" />
                  <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    {/* Employee Info */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-3 flex items-start gap-3">
                        <div className="shrink-0 rounded-lg bg-orange-100/90 p-2 text-orange-600 shadow-sm dark:bg-orange-500/15 dark:text-orange-200">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2 flex-wrap">
                            <h4 className="truncate text-lg font-semibold text-foreground">
                              {displayName}
                              {employee.is_archived && (
                                <span className="ml-2 text-xs text-muted-foreground">(Arkiverad)</span>
                              )}
                            </h4>
                            {hasFortnoxConnection && fortnoxMappings.has(employee.id) && (
                              <Badge variant="outline" className="flex items-center gap-1 text-xs shrink-0">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span>Fortnox-lön</span>
                              </Badge>
                            )}
                          </div>
                          {subtitle && (
                            <p className="text-sm text-muted-foreground">{subtitle}</p>
                          )}
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {employee.email && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">E-post: {employee.email}</span>
                          </div>
                        )}
                        {employee.phone_mobile && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Mobil: {employee.phone_mobile}</span>
                          </div>
                        )}
                        {employee.hourly_rate_sek && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">
                              Timpris: {employee.hourly_rate_sek.toFixed(2)} SEK
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
                          router.push(`/dashboard/employees/${employee.id}`);
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
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground/80" />
            {search ? (
              <>
                <h3 className="mb-2 text-lg font-semibold">
                  Inga personer hittades för &quot;{search}&quot;
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
                  {includeArchived ? 'Inga personer hittades med dessa filter' : 'Du har ingen personal än'}
                </p>
                {canManageEmployees && (
                  <Button 
                    onClick={() => router.push('/dashboard/employees/new')}
                    className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Skapa din första personal
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

