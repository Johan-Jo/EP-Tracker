"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TimeSlider } from '@/components/core/time-slider';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

interface DashboardClientProps {
  userName: string;
  stats: {
    active_projects: number;
    total_hours_week: number;
    total_materials_week: number;
    total_time_entries_week: number;
  };
  activeTimeEntry?: {
    id: string;
    start_at: string;
    projects: { id: string; name: string } | null;
  } | null;
  recentProject?: {
    id: string;
    name: string;
  } | null;
  allProjects: Array<{
    id: string;
    name: string;
  }>;
    recentActivities: Array<{
      id: string;
      type: 'time_entry' | 'material' | 'expense' | 'ata' | 'diary' | 'mileage';
      created_at: string;
      project: { id: string; name: string } | null;
      user_name?: string;
      data: any;
      description: string;
    }>;
  userId: string;
}

export default function DashboardClient({ userName, stats, activeTimeEntry, recentProject, allProjects, recentActivities, userId }: DashboardClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showDiaryPromptDialog, setShowDiaryPromptDialog] = useState(false);
  const [completedProjectId, setCompletedProjectId] = useState<string | null>(null);
  const [showQuickStartBanner, setShowQuickStartBanner] = useState(true);
  
  // EPIC 26: Optimistic UI state for instant feedback
  const [optimisticTimeEntry, setOptimisticTimeEntry] = useState(activeTimeEntry);
  
  const displayedActivities = showAllActivities ? recentActivities : recentActivities.slice(0, 5);

  // Prevent hydration mismatch for date formatting
  useEffect(() => {
    setIsClient(true);
    
    // Check if user has dismissed the quick start banner
    const dismissed = localStorage.getItem(`quickStartDismissed_${userId}`);
    if (dismissed === 'true') {
      setShowQuickStartBanner(false);
    }
  }, [userId]);

  // EPIC 26: Sync optimistic state when server data changes
  useEffect(() => {
    setOptimisticTimeEntry(activeTimeEntry);
  }, [activeTimeEntry]);

  // EPIC 26: Optimistic check-in - INSTANT UI, background sync!
  const handleCheckIn = async (projectId: string) => {
    const project = allProjects.find(p => p.id === projectId);
    const tempId = `temp-${Date.now()}`;
    const startTime = new Date().toISOString();
    
    // ⚡ INSTANT UI update! No waiting!
    setOptimisticTimeEntry({
      id: tempId,
      start_at: startTime,
      projects: project ? { id: project.id, name: project.name } : null,
    });

    // 🔄 Background sync - user doesn't wait for this!
    fetch('/api/time/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        start_at: startTime,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to start time entry:', errorText);
          throw new Error('Failed to start time entry');
        }
        const data = await response.json();
        // Update with real entry ID from server (silent background update)
        setOptimisticTimeEntry({
          id: data.entry.id,
          start_at: data.entry.start_at,
          projects: project ? { id: project.id, name: project.name } : null,
        });
        // Invalidate time entries queries so time page shows new entry
        // Use prefix matching to invalidate all related queries
        queryClient.invalidateQueries({ queryKey: ['time-entries-stats'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['time-entries'], exact: false });
      })
      .catch((error) => {
        console.error('Error starting time:', error);
        // Rollback optimistic update on error
        setOptimisticTimeEntry(activeTimeEntry);
      });
  };

  // EPIC 26: Optimistic check-out - INSTANT UI, background sync!
  const handleCheckOut = async (customStopAt?: string, customStartAt?: string) => {
    if (!optimisticTimeEntry) return;

    const entryIdToStop = optimisticTimeEntry.id;
    const previousEntry = optimisticTimeEntry;
    
    // Check if we're using a temporary ID - if so, wait a bit for check-in to complete
    // or show an error if checkout happens too quickly
    if (entryIdToStop.startsWith('temp-')) {
      console.error('Cannot checkout: Entry still being created. Please wait a moment.');
      // Rollback - keep timer running
      setOptimisticTimeEntry(previousEntry);
      // Show user-friendly error toast
      toast.error('Vänta ett ögonblick medan tiden registreras, försök sedan igen.', {
        duration: 4000,
      });
      return;
    }
    
    // ⚡ INSTANT UI update! Timer disappears immediately!
    setOptimisticTimeEntry(null);

    // Prepare update body - include both start_at and stop_at if custom times provided
    const updateBody: { stop_at: string; start_at?: string } = {
      stop_at: customStopAt || new Date().toISOString(),
    };
    
    // Include start_at only if it was edited
    if (customStartAt) {
      updateBody.start_at = customStartAt;
    }

    // 🔄 Background sync - user doesn't wait for this!
    fetch(`/api/time/entries/${entryIdToStop}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateBody),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to stop time entry:', errorData);
          throw new Error(errorData.error || 'Failed to stop time entry');
        }
        // Success - timer already stopped in UI, no action needed
        // Invalidate time entries queries so time page shows updated entry
        // Use prefix matching to invalidate all related queries
        queryClient.invalidateQueries({ queryKey: ['time-entries-stats'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['time-entries'], exact: false });
      })
      .catch((error) => {
        console.error('Error stopping time:', error);
        // Rollback optimistic update on error
        setOptimisticTimeEntry(previousEntry);
        // Show error toast to user
        toast.error('Kunde inte checka ut. Försök igen.', {
          duration: 4000,
        });
      });
  };

  // Handle check-out complete callback - show diary prompt
  const handleCheckOutComplete = (projectId: string) => {
    setCompletedProjectId(projectId);
    setShowDiaryPromptDialog(true);
  };

  // Handle dismissing quick start banner
  const handleDismissQuickStart = () => {
    setShowQuickStartBanner(false);
    localStorage.setItem(`quickStartDismissed_${userId}`, 'true');
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 transition-colors dark:bg-[#0A0908] min-h-screen">
      {/* Diary Prompt Dialog */}
      <Dialog open={showDiaryPromptDialog} onOpenChange={setShowDiaryPromptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bra jobbat! 👏</DialogTitle>
            <DialogDescription>
              Du har checkat ut från projektet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Vill du skapa en dagbokspost om detta projekt nu?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDiaryPromptDialog(false)}
                className="flex-1"
              >
                Inte nu
              </Button>
              <Link 
                href={`/dashboard/diary/new?project_id=${completedProjectId}`}
                className="flex-1"
                onClick={() => setShowDiaryPromptDialog(false)}
              >
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  Skapa dagbokspost
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <section className="mb-6 space-y-4 text-[var(--color-gray-900)] dark:text-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Hej {userName || 'vän'} 👋</h1>
              <p className="text-sm text-muted-foreground dark:text-white/70">Här hittar du en snabb överblick över organisationens aktivitet.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/help')}
              className="flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Hjälp & guider</span>
              <span className="sm:hidden">Hjälp</span>
            </Button>
          </div>
          {showQuickStartBanner && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 md:p-6 dark:border-[#3a251d] dark:bg-[#221610]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-orange-900 dark:text-[#f3c089]">Kom igång med EP Tracker</h2>
                  <p className="text-sm text-muted-foreground dark:text-white/70">Snabbguide till att sätta upp projekt, check-in och dagbok.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => router.push('/dashboard/projects/new')} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                    Skapa projekt
                  </Button>
                  <Button onClick={() => router.push('/dashboard/diary/new')} size="sm" variant="outline" className="border-orange-400 text-orange-600">
                    Starta dagbok
                  </Button>
                  <Button onClick={handleDismissQuickStart} size="sm" variant="ghost">
                    Visa inte igen
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm transition-colors dark:border-[#2e3744] dark:bg-[#171c22]">
            <div className="p-5">
              <p className="text-sm text-muted-foreground">Aktiva projekt</p>
              <p className="mt-2 text-2xl font-semibold">{stats.active_projects}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm transition-colors dark:border-[#2e3744] dark:bg-[#171c22]">
            <div className="p-5">
              <p className="text-sm text-muted-foreground">Timmar denna vecka</p>
              <p className="mt-2 text-2xl font-semibold">{stats.total_hours_week}h</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm transition-colors dark:border-[#2e3744] dark:bg-[#171c22]">
            <div className="p-5">
              <p className="text-sm text-muted-foreground">Material & utgifter</p>
              <p className="mt-2 text-2xl font-semibold">{stats.total_materials_week} kr</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm transition-colors dark:border-[#2e3744] dark:bg-[#171c22]">
            <div className="p-5">
              <p className="text-sm text-muted-foreground">Registreringar</p>
              <p className="mt-2 text-2xl font-semibold">{stats.total_time_entries_week}</p>
            </div>
          </div>
        </div>
 
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm transition-colors dark:border-[#2e3744] dark:bg-[#181d24]">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="text-lg font-semibold">Snabbstart</h2>
                <p className="text-sm text-muted-foreground">Sätt upp ditt första projekt</p>
              </div>
              <Link href="/dashboard/projects/new">
                <Button variant="outline" size="sm" className="h-8">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nytt projekt
                </Button>
              </Link>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Skapa ett nytt projekt för att börja spåra din tid och material.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm transition-colors dark:border-[#2e3744] dark:bg-[#181d24]">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="text-lg font-semibold">Pågående tidtagning</h2>
                <p className="text-sm text-muted-foreground">Registrera din aktivitet</p>
              </div>
              <Link href="/dashboard/time">
                <Button variant="outline" size="sm" className="h-8">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="13" r="8" />
                  </svg>
                  Logga tid
                </Button>
              </Link>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Starta en ny tidtagning för att registrera din arbetstid.
              </p>
            </div>
          </div>
        </div>
        </section>

        <Dialog open={showDiaryPromptDialog} onOpenChange={setShowDiaryPromptDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bra jobbat! 👏</DialogTitle>
              <DialogDescription>
                Du har checkat ut från projektet.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Vill du skapa en dagbokspost om detta projekt nu?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDiaryPromptDialog(false)}
                  className="flex-1"
                >
                  Inte nu
                </Button>
                <Link 
                  href={`/dashboard/diary/new?project_id=${completedProjectId}`}
                  className="flex-1"
                  onClick={() => setShowDiaryPromptDialog(false)}
                >
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    Skapa dagbokspost
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      {/* Quick actions */}
      <div className="mt-6" data-tour="quick-actions">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Snabbåtgärder</h2>
        <p className="text-sm text-gray-600 mb-4">Vanliga uppgifter för att komma igång snabbt</p>
        <div className="grid md:grid-cols-3 gap-4">
          {/* SOLID ORANGE CARD */}
          <button
            onClick={() => router.push('/dashboard/projects/new')}
            className="rounded-xl bg-orange-500 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-600 min-h-[120px] sm:min-h-[128px]"
          >
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium">Nytt projekt</div>
                <div className="text-sm text-white/90">Skapa ett nytt projekt</div>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/dashboard/time')}
            className="group rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-500/60 hover:shadow-lg dark:border-[#3c2d20]/40 dark:bg-[#16100b] dark:text-orange-100 min-h-[120px] sm:min-h-[128px]"
          >
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors group-hover:bg-orange-500/10 group-hover:text-orange-600 dark:bg-white/10 dark:text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M9 2h6M12 9v5" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium dark:text-white">Logga tid</div>
                <div className="text-sm text-gray-600 dark:text-white/70">Registrera arbetstid</div>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/dashboard/materials')}
            className="group rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-500/60 hover:shadow-lg dark:border-[#3c2d20]/40 dark:bg-[#16100b] dark:text-orange-100 min-h-[120px] sm:min-h-[128px]"
          >
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors group-hover:bg-orange-500/10 group-hover:text-orange-600 dark:bg-white/10 dark:text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2 3 7l9 5 9-5-9-5Z" />
                  <path d="M3 7v10l9 5 9-5V7" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium dark:text-white">Lägg till material</div>
                <div className="text-sm text-gray-600 dark:text-white/70">Hantera material</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Senaste aktivitet</h2>
        <div className="flex flex-col gap-3">
          {recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white/95 p-10 text-center shadow-sm dark:border-[#2f2117] dark:bg-[#1a140f]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-400 dark:text-white/80" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div className="mt-4 text-[15px] font-medium text-gray-900 dark:text-white">Ingen aktivitet ännu</div>
              <div className="mt-1 max-w-md text-sm text-gray-600 dark:text-white/70">
                Börja logga tid eller skapa ett projekt för att se din aktivitet här
              </div>
            </div>
          ) : (
            <>
                {displayedActivities.map((activity) => {
                  const createdDate = new Date(activity.created_at);
                  
                  // Render based on activity type
                  const getActivityDetails = () => {
                    switch (activity.type) {
                      case 'time_entry': {
                        // Use description from activity_log instead of trying to format dates
                        // This avoids date validation issues
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 7v5l3 2" />
                            </svg>
                          ),
                          iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-400/20 dark:text-white',
                          title: 'Tidsrapport',
                          description: activity.description || 'Tidrapport skapad',
                          badge: null,
                          badgeColor: '',
                        };
                      }
                      case 'material':
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2 3 7l9 5 9-5-9-5Z" />
                              <path d="M3 7v10l9 5 9-5V7" />
                            </svg>
                          ),
                          iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-400/20 dark:text-white',
                          title: 'Material',
                          description: activity.description || 'Material tillagt',
                          badge: activity.data?.qty && activity.data?.unit ? `${activity.data.qty} ${activity.data.unit}` : null,
                          badgeColor: 'text-blue-600 dark:text-white',
                        };
                      case 'expense':
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                          ),
                          iconBg: 'bg-green-100 text-green-600 dark:bg-green-400/20 dark:text-white',
                          title: 'Utgift',
                          description: activity.description || 'Utgift registrerad',
                          badge: activity.data?.amount_sek ? `${activity.data.amount_sek} kr` : null,
                          badgeColor: 'text-green-600 dark:text-white',
                        };
                      case 'mileage':
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                              <circle cx="7" cy="17" r="2" />
                              <path d="M9 17h6" />
                              <circle cx="17" cy="17" r="2" />
                            </svg>
                          ),
                          iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-400/20 dark:text-white',
                          title: 'Milersättning',
                          description: activity.description || 'Milersättning registrerad',
                          badge: activity.data?.distance_km ? `${activity.data.distance_km} km` : null,
                          badgeColor: 'text-teal-600 dark:text-white',
                        };
                      case 'ata':
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          ),
                          iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-400/20 dark:text-white',
                          title: 'ÄTA',
                          description: activity.description || 'ÄTA skapad',
                          badge: null,
                          badgeColor: '',
                        };
                      case 'diary':
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                          ),
                          iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-400/20 dark:text-white',
                          title: 'Dagbok',
                          description: activity.description || 'Dagboksanteckning skapad',
                          badge: null,
                          badgeColor: '',
                        };
                      default:
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 7v5l3 2" />
                            </svg>
                          ),
                          iconBg: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white',
                          title: activity.type,
                          description: activity.description || 'Aktivitet',
                          badge: null,
                          badgeColor: '',
                        };
                    }
                  };

                  const details = getActivityDetails();
                  if (!details) return null;

                  // Determine where to navigate based on activity type
                  const getNavigationPath = () => {
                    switch (activity.type) {
                      case 'time_entry':
                        return '/dashboard/time';
                      case 'material':
                        return '/dashboard/materials';
                      case 'expense':
                        return '/dashboard/materials';
                      case 'mileage':
                        return '/dashboard/materials';
                      case 'ata':
                        return '/dashboard/ata';
                      case 'diary':
                        return '/dashboard/diary';
                      default:
                        return null;
                    }
                  };

                  const navigationPath = getNavigationPath();

                  return (
                    <div 
                      key={activity.id} 
                      onClick={() => navigationPath && router.push(navigationPath)}
                      className={`rounded-2xl border border-gray-200/80 bg-white/95 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-[#2f2117] dark:bg-[#1a140f] dark:text-orange-100/85 ${navigationPath ? 'cursor-pointer hover:border-orange-400/40 dark:hover:border-orange-400/40' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${details.iconBg}`}>
                          {details.icon}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <span className="font-semibold uppercase tracking-wide text-gray-500 dark:text-white/70">
                              {details.title}
                            </span>
                            {activity.user_name && (
                              <span className="text-gray-900 dark:text-white">{activity.user_name}</span>
                            )}
                            {activity.project && (
                              <span className="text-gray-600 dark:text-white/70">• {activity.project.name}</span>
                            )}
                            <span className="text-gray-500 dark:text-white/60">
                              {createdDate.toLocaleDateString('sv-SE', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              {createdDate.toLocaleTimeString('sv-SE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-white/80">{details.description}</p>
                          {details.badge && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border border-current px-2 py-0.5 text-xs font-semibold ${details.badgeColor}`}
                            >
                              {details.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {/* Show More button */}
              {recentActivities.length > 5 && (
                  <button
                    onClick={() => setShowAllActivities(!showAllActivities)}
                  className="rounded-full border border-orange-200/70 bg-white px-6 py-2 text-sm font-medium text-orange-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-400 hover:text-orange-700 hover:shadow-md dark:border-orange-500/40 dark:bg-[#1a140f] dark:text-orange-200 dark:hover:border-orange-400"
                  >
                    {showAllActivities ? 'Visa färre' : `Visa fler (${recentActivities.length - 5} till)`}
                  </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="h-10" />

      <PageTourTrigger tourId="dashboard" />
      </main>
    </div>
  );
}
