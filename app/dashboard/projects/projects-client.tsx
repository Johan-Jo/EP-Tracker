"use client";

import { Plus, Search, FolderKanban, Clock, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

interface Project {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  project_number: string | null;
  site_address: string | null;
  created_at: string;
  budget_hours: number | null;
  budget_amount: number | null;
  phases?: { count: number }[];
  total_hours?: number;
}

interface ProjectsClientProps {
  projects: Project[];
  canCreateProjects: boolean;
  search: string;
  status: string;
}

export default function ProjectsClient({ projects, canCreateProjects, search, status }: ProjectsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();


  /**
   * PERFORMANCE OPTIMIZATION (Story 26.3):
   * Use Next.js router instead of window.location for instant navigation
   * This prevents full page reloads and maintains SPA benefits
   * Expected improvement: 80-90% faster navigation
   */
  const handleSearch = (searchValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchValue && searchValue.trim()) {
      params.set('search', searchValue.trim());
    } else {
      params.delete('search');
    }
    
    const newUrl = `${pathname}?${params.toString()}`;
    // Use Next.js router for instant client-side navigation
    router.push(newUrl);
  };

  const clearSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    // Use Next.js router for instant client-side navigation
    router.push(newUrl);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200';
      case 'planning':
      case 'paused':
        return 'border border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200';
      case 'completed':
        return 'border border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-500/40 dark:bg-white/10 dark:text-gray-200';
      case 'archived':
        return 'border border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-600/40 dark:bg-white/5 dark:text-gray-400';
      default:
        return 'border border-border/60 bg-muted/70 text-muted-foreground dark:border-border/40 dark:bg-white/5 dark:text-muted-foreground/80';
    }
  };

  const handleStatusChange = (nextStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextStatus === 'all') {
      params.set('status', 'all');
    } else {
      params.set('status', nextStatus);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'planning':
        return 'Planering';
      case 'paused':
        return 'Pausad';
      case 'completed':
        return 'Avslutad';
      case 'archived':
        return 'Arkiverad';
      default:
        return status;
    }
  };

  // Count projects by status
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const archivedProjects = projects.filter((p) => p.status === 'archived').length;

  const statusOptions = [
    { key: 'all', label: 'Alla', count: totalProjects },
    { key: 'active', label: 'Aktiva', count: activeProjects },
    { key: 'completed', label: 'Avslutade', count: completedProjects },
    { key: 'archived', label: 'Arkiverade', count: archivedProjects },
  ];

  return (
    <div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/70 bg-[var(--color-card)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-card)]/75 dark:border-black dark:bg-black dark:supports-[backdrop-filter]:bg-black/85">
        <div className="px-4 py-4 md:px-8 md:py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="mb-1 text-3xl font-bold text-foreground">Projekt</h1>
              <p className="text-sm text-muted-foreground">
                Hantera och följ alla dina projekt
              </p>
            </div>
            {canCreateProjects && (
              <Button 
                onClick={() => router.push('/dashboard/projects/new')}
                className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200 bg-orange-500 hover:bg-orange-600"
                data-tour="create-project"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Nytt projekt</span>
                <span className="md:hidden">Nytt</span>
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="project-search-input"
                placeholder="Sök projekt..."
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
                const input = document.getElementById('project-search-input') as HTMLInputElement;
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {/* Status Filters */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4" data-tour="projects-list">
          {statusOptions.map((option) => {
            const isActive = status === option.key || (option.key === 'all' && status === 'all');
            return (
              <button
                key={option.key}
                onClick={() => handleStatusChange(option.key)}
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

        {/* Projects List */}
        {projects && projects.length > 0 ? (
          <div className="space-y-4">
            {search ? (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">
                  Hittade {projects.length} {projects.length === 1 ? 'projekt' : 'projekt'} som motsvarar din sökning &quot;{search}&quot;
                </h3>
                <p className="text-sm text-muted-foreground">
                  {status === 'active' && 'Visar endast aktiva projekt'}
                  {status === 'all' && 'Visar alla projekt'}
                </p>
              </div>
            ) : (
              <h3 className="text-lg font-semibold">
                {status === 'active' ? 'Aktiva projekt' : status === 'all' ? 'Alla projekt' : 'Projekt'}
              </h3>
            )}
            
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-[var(--color-card)]/95 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-xl md:p-6 dark:border-border/40 dark:bg-[var(--color-card)]/80"
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-orange-400/10" />
                <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="shrink-0 rounded-lg bg-orange-100/90 p-2 text-orange-600 shadow-sm dark:bg-orange-500/15 dark:text-orange-200">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="mb-1 truncate text-lg font-semibold text-foreground">{project.name}</h4>
                        {project.client_name && (
                          <p className="text-sm text-muted-foreground">Kund: {project.client_name}</p>
                        )}
                        {project.project_number && (
                          <p className="text-sm text-muted-foreground">#{project.project_number}</p>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar - only show if budget exists */}
                    {project.budget_hours && project.budget_hours > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Framsteg</span>
                          <span className={`font-medium ${
                            ((project.total_hours || 0) / project.budget_hours) > 1 
                              ? 'text-red-600 dark:text-red-300' 
                              : ''
                          }`}>
                            {Math.round(((project.total_hours || 0) / project.budget_hours) * 100)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted/80 dark:bg-white/10">
                          <div
                            className={`h-full transition-all duration-300 ${
                              ((project.total_hours || 0) / project.budget_hours) > 1
                                ? 'bg-red-500 dark:bg-red-400'
                                : 'bg-orange-500 dark:bg-orange-400'
                            }`}
                            style={{ 
                              width: `${Math.min(((project.total_hours || 0) / project.budget_hours) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{project.total_hours || 0}h</span>
                      </div>
                      {(project.budget_hours || project.budget_amount) && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Budget:</span>
                          {project.budget_hours && (
                            <span className="font-medium">{project.budget_hours}h</span>
                          )}
                          {project.budget_hours && project.budget_amount && (
                            <span className="text-muted-foreground mx-1">/</span>
                          )}
                          {project.budget_amount && (
                            <span className="font-medium">{project.budget_amount.toLocaleString('sv-SE')} kr</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Start: {new Date(project.created_at).toLocaleDateString('sv-SE')}
                        </span>
                      </div>
                      {project.site_address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground truncate max-w-xs">{project.site_address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <FolderKanban className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{project.phases?.[0]?.count || 0} faser</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-3 md:flex-col md:items-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/70 bg-[var(--color-card)]/90 text-foreground transition-all duration-200 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-500 dark:border-border/40 dark:bg-[var(--color-card)]/70"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/projects/${project.id}`);
                      }}
                    >
                      Öppna
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-[var(--color-card)]/95 p-12 text-center shadow-sm dark:border-border/40 dark:bg-[var(--color-card)]/80">
            <FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground/80" />
            {search ? (
              <>
                <h3 className="mb-2 text-lg font-semibold">
                  Inga projekt hittades för &quot;{search}&quot;
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
                  {status !== 'active' ? 'Inga projekt hittades med dessa filter' : 'Du har inga projekt än'}
                </p>
                {status === 'active' && canCreateProjects && (
                  <Button 
                    onClick={() => router.push('/dashboard/projects/new')}
                    className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Skapa ditt första projekt
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </main>
      <PageTourTrigger tourId="projects" />
    </div>
  );
}

