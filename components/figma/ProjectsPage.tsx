"use client";
import { Plus, Search, FolderKanban, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ProjectsPage() {
  const projects = [
    {
      id: 1,
      name: 'Kök Renovering - Storgatan 12',
      client: 'Anna Andersson',
      status: 'active',
      progress: 65,
      timeSpent: '42h',
      budget: '125,000 kr',
      lastActivity: 'Idag 14:32'
    },
    {
      id: 2,
      name: 'Badrumsrenovering Villa',
      client: 'Erik Eriksson',
      status: 'planning',
      progress: 15,
      timeSpent: '8h',
      budget: '85,000 kr',
      lastActivity: 'Igår 16:20'
    },
    {
      id: 3,
      name: 'Nybygge Altan',
      client: 'Maria Svensson',
      status: 'active',
      progress: 80,
      timeSpent: '65h',
      budget: '95,000 kr',
      lastActivity: 'Idag 09:15'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'planning':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
      case 'completed':
        return 'Avslutad';
      default:
        return status;
    }
  };

  return (
    <div className="flex-1 overflow-auto pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="mb-1">Projekt</h1>
              <p className="text-sm text-muted-foreground">
                Hantera och följ alla dina projekt
              </p>
            </div>
            <Button className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Nytt projekt</span>
              <span className="md:hidden">Nytt</span>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Sök projekt..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="shrink-0">
              Filter
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-6 max-w-7xl">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totalt</p>
                <p className="text-xl">12</p>
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <FolderKanban className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktiva</p>
                <p className="text-xl">8</p>
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planering</p>
                <p className="text-xl">3</p>
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total tid</p>
                <p className="text-xl">348h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <h3>Aktiva projekt</h3>
          
          {projects.map((project) => (
            <div
              key={project.id}
              className="group bg-card border-2 border-border rounded-xl p-4 md:p-6 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent shrink-0">
                      <FolderKanban className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="mb-1 truncate">{project.name}</h4>
                      <p className="text-sm text-muted-foreground">Kund: {project.client}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Framsteg</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{project.timeSpent}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Budget:</span>
                      <span>{project.budget}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Senast:</span>
                      <span>{project.lastActivity}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-3 md:flex-col md:items-end">
                  <span className={`px-3 py-1 rounded-full text-xs border-2 ${getStatusColor(project.status)}`}>
                    {getStatusText(project.status)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all duration-200"
                  >
                    Öppna
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

