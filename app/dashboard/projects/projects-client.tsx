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
        return 'bg-green-100 text-green-700 border-green-200';
      case 'planning':
      case 'paused':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'archived':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const planningProjects = projects.filter(p => p.status === 'paused').length;

  return (
    <div className="flex-1 overflow-auto pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">Projekt</h1>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="project-search-input"
                placeholder="Sök projekt..."
                className="pl-9"
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
              className="shrink-0"
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
                className="shrink-0"
                onClick={clearSearch}
              >
                Rensa
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-6 max-w-7xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-tour="projects-list">
          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-orange-500/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <FolderKanban className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totalt</p>
                <p className="text-2xl font-semibold">{totalProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-orange-500/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <FolderKanban className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktiva</p>
                <p className="text-2xl font-semibold">{activeProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-orange-500/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planering</p>
                <p className="text-2xl font-semibold">{planningProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-orange-500/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faser</p>
                <p className="text-2xl font-semibold">
                  {projects.reduce((acc, p) => acc + (p.phases?.[0]?.count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
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
                className="group bg-card border-2 border-border rounded-xl p-4 md:p-6 hover:border-orange-500/30 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-orange-100 shrink-0">
                        <FolderKanban className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold mb-1 truncate">{project.name}</h4>
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
                              ? 'text-red-600' 
                              : ''
                          }`}>
                            {Math.round(((project.total_hours || 0) / project.budget_hours) * 100)}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              ((project.total_hours || 0) / project.budget_hours) > 1
                                ? 'bg-red-500'
                                : 'bg-orange-500'
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
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getStatusColor(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-500/50 transition-all duration-200"
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
          <div className="bg-card border-2 border-border rounded-xl p-12 text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            {search ? (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  Inga projekt hittades för &quot;{search}&quot;
                </h3>
                <p className="text-muted-foreground mb-4">
                  Prova att söka på något annat eller rensa sökningen
                </p>
                <Button 
                  variant="outline"
                  onClick={clearSearch}
                >
                  Rensa sökning
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  {status !== 'active' ? 'Inga projekt hittades med dessa filter' : 'Du har inga projekt än'}
                </p>
                {status === 'active' && canCreateProjects && (
                  <Button 
                    onClick={() => router.push('/dashboard/projects/new')}
                    className="bg-orange-500 hover:bg-orange-600"
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

