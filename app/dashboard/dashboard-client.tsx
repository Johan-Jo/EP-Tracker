"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { TimeSlider } from '@/components/core/time-slider';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

interface DashboardClientProps {
  userName: string;
  stats: {
    projectsCount: number;
    timeEntriesCount: number;
    materialsCount: number;
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
    type: 'time' | 'material' | 'expense' | 'ata' | 'diary';
    created_at: string;
    project: { id: string; name: string } | null;
    user_name?: string;
    data: any;
  }>;
  userId: string;
}

export default function DashboardClient({ userName, stats, activeTimeEntry, recentProject, allProjects, recentActivities, userId }: DashboardClientProps) {
  const router = useRouter();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // EPIC 26: Optimistic UI state for instant feedback
  const [optimisticTimeEntry, setOptimisticTimeEntry] = useState(activeTimeEntry);
  
  const displayedActivities = showAllActivities ? recentActivities : recentActivities.slice(0, 5);

  // Prevent hydration mismatch for date formatting
  useEffect(() => {
    setIsClient(true);
  }, []);

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
          throw new Error('Failed to start time entry');
        }
        const data = await response.json();
        // Update with real entry ID from server (silent background update)
        setOptimisticTimeEntry({
          id: data.entry.id,
          start_at: data.entry.start_at,
          projects: project ? { id: project.id, name: project.name } : null,
        });
      })
      .catch((error) => {
        console.error('Error starting time:', error);
        // Rollback optimistic update on error
        setOptimisticTimeEntry(activeTimeEntry);
      });
  };

  // EPIC 26: Optimistic check-out - INSTANT UI, background sync!
  const handleCheckOut = () => {
    if (!optimisticTimeEntry) return;

    const entryIdToStop = optimisticTimeEntry.id;
    const previousEntry = optimisticTimeEntry;
    
    // ⚡ INSTANT UI update! Timer disappears immediately!
    setOptimisticTimeEntry(null);

    // 🔄 Background sync - user doesn't wait for this!
    fetch(`/api/time/entries/${entryIdToStop}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stop_at: new Date().toISOString(),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to stop time entry');
        }
        // Success - timer already stopped in UI, no action needed
      })
      .catch((error) => {
        console.error('Error stopping time:', error);
        // Rollback optimistic update on error
        setOptimisticTimeEntry(previousEntry);
      });
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Welcome */}
      <div className="mb-6" data-tour="dashboard-header">
        <h1 className="text-2xl font-bold text-gray-900">
          Välkommen, {userName}! <span className="align-middle">👋</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Här är en översikt över dina projekt och aktiviteter.
        </p>
      </div>

      {/* Time Check-in/Check-out Slider - EPIC 26: Uses optimistic state */}
      <div className="mb-6 bg-gradient-to-r from-orange-50 to-orange-100/50 border-2 border-orange-200 rounded-xl p-4" data-tour="time-slider">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="leading-tight flex-1 min-w-0">
            <div className={optimisticTimeEntry ? "text-sm font-medium" : "text-base font-medium"}>
              {optimisticTimeEntry ? 'Aktiv tid' : 'Ingen aktiv tid'}
            </div>
          </div>
        </div>
        
        {/* Centered check-in info above timer */}
        {optimisticTimeEntry && optimisticTimeEntry.start_at && optimisticTimeEntry.projects?.name && (
          <div className="text-center text-sm text-gray-700 mb-2">
            Du checkade in <span className="font-bold">{new Date(optimisticTimeEntry.start_at).toLocaleTimeString('sv-SE', {
              hour: '2-digit',
              minute: '2-digit'
            })}</span>, projekt: <span className="font-bold text-orange-600">{optimisticTimeEntry.projects.name}</span>
          </div>
        )}
        <TimeSlider
          isActive={!!optimisticTimeEntry}
          projectName={
            optimisticTimeEntry 
              ? optimisticTimeEntry.projects?.name 
              : recentProject?.name
          }
          projectId={
            optimisticTimeEntry 
              ? optimisticTimeEntry.projects?.id 
              : recentProject?.id
          }
          startTime={optimisticTimeEntry?.start_at}
          availableProjects={allProjects}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />
      </div>

      {/* Quick Start Banner - BLUE GRADIENT */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 sm:p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="font-medium">Kom igång snabbt</div>
              <div className="text-sm text-gray-600">
                Följ vår snabbguide för att sätta upp ditt första projekt
              </div>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard?tour=dashboard')}
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-blue-300 bg-white text-blue-600 text-sm font-medium hover:bg-blue-50"
          >
            Starta interaktiv guide
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6" data-tour="quick-actions">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Snabbåtgärder</h2>
        <p className="text-sm text-gray-600 mb-4">Vanliga uppgifter för att komma igång snabbt</p>
        <div className="grid md:grid-cols-3 gap-4">
          {/* SOLID ORANGE CARD */}
          <button
            onClick={() => router.push('/dashboard/projects/new')}
            className="rounded-xl bg-orange-500 text-white shadow-sm hover:bg-orange-600 transition-all"
          >
            <div className="p-5 sm:p-6 flex items-center gap-4">
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
            className="group rounded-xl bg-white border border-gray-200 shadow-sm hover:border-orange-500 hover:shadow-md transition-all"
          >
            <div className="p-5 sm:p-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gray-100 text-gray-600 group-hover:text-orange-500 flex items-center justify-center transition-colors">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M9 2h6M12 9v5" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium">Logga tid</div>
                <div className="text-sm text-gray-600">Registrera arbetstid</div>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/dashboard/materials')}
            className="group rounded-xl bg-white border border-gray-200 shadow-sm hover:border-orange-500 hover:shadow-md transition-all"
          >
            <div className="p-5 sm:p-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gray-100 text-gray-600 group-hover:text-orange-500 flex items-center justify-center transition-colors">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2 3 7l9 5 9-5-9-5Z" />
                  <path d="M3 7v10l9 5 9-5V7" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium">Lägg till material</div>
                <div className="text-sm text-gray-600">Hantera material</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-orange-500 hover:shadow-md cursor-pointer transition-all" onClick={() => router.push('/dashboard/projects')}>
          <div className="p-5 sm:p-6">
            <div className="text-sm text-gray-600">Aktiva Projekt</div>
            <div className="mt-1 text-2xl font-semibold">{stats.projectsCount}</div>
            <div className="mt-2 text-sm text-gray-600 hover:text-gray-900">Visa alla projekt →</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-orange-500 hover:shadow-md cursor-pointer transition-all" onClick={() => router.push('/dashboard/time')}>
          <div className="p-5 sm:p-6">
            <div className="text-sm text-gray-600">Tidsrapporter denna vecka</div>
            <div className="mt-1 text-2xl font-semibold">{stats.timeEntriesCount}</div>
            <div className="mt-2 text-sm text-gray-600 hover:text-gray-900">Logga tid →</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-orange-500 hover:shadow-md cursor-pointer transition-all" onClick={() => router.push('/dashboard/materials')}>
          <div className="p-5 sm:p-6">
            <div className="text-sm text-gray-600">Material & Utgifter denna vecka</div>
            <div className="mt-1 text-2xl font-semibold">{stats.materialsCount}</div>
            <div className="mt-2 text-sm text-gray-600 hover:text-gray-900">Hantera material & utgifter →</div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Senaste aktivitet</h2>
        <div className="bg-white rounded-2xl border border-gray-200">
          {recentActivities.length === 0 ? (
            <div className="p-10 sm:p-14 flex flex-col items-center justify-center text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div className="mt-4 text-[15px] font-medium">Ingen aktivitet ännu</div>
              <div className="mt-1 text-sm text-gray-600 max-w-md">
                Börja logga tid eller skapa ett projekt för att se din aktivitet här
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {displayedActivities.map((activity) => {
                  const createdDate = new Date(activity.created_at);
                  
                  // Render based on activity type
                  const getActivityDetails = () => {
                    switch (activity.type) {
                      case 'time': {
                        const startDate = new Date(activity.data.start_at);
                        const duration = activity.data.stop_at 
                          ? Math.round((new Date(activity.data.stop_at).getTime() - startDate.getTime()) / (1000 * 60 * 60) * 10) / 10
                          : null;
                        
                        // Format date consistently for server and client
                        const formatDate = (date: Date) => {
                          if (!isClient) {
                            // Server-side: use simple format
                            const d = date.toISOString().split('T')[0];
                            const t = date.toISOString().split('T')[1].slice(0, 5);
                            return { date: d, time: t };
                          }
                          // Client-side: use locale format
                          return {
                            date: date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' }),
                            time: date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
                          };
                        };
                        
                        const formattedStart = formatDate(startDate);
                        const formattedStop = activity.data.stop_at ? formatDate(new Date(activity.data.stop_at)) : null;
                        
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 7v5l3 2" />
                            </svg>
                          ),
                          iconBg: 'bg-orange-100 text-orange-600',
                          title: 'Tidsrapport',
                          description: `${formattedStart.date} kl ${formattedStart.time}${formattedStop ? ` - ${formattedStop.time}` : ''}`,
                          badge: duration !== null ? `${duration}h` : 'Pågår',
                          badgeColor: duration !== null ? 'text-orange-600' : 'text-green-600 bg-green-50 px-2 py-1 rounded-full',
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
                          iconBg: 'bg-blue-100 text-blue-600',
                          title: 'Material',
                          description: `${activity.data.description} - ${activity.data.qty} ${activity.data.unit}`,
                          badge: null,
                          badgeColor: '',
                        };
                      case 'expense':
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                          ),
                          iconBg: 'bg-green-100 text-green-600',
                          title: 'Utgift',
                          description: activity.data.description,
                          badge: `${activity.data.amount_sek} kr`,
                          badgeColor: 'text-green-600',
                        };
                      case 'ata':
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          ),
                          iconBg: 'bg-purple-100 text-purple-600',
                          title: 'ÄTA',
                          description: activity.data.title,
                          badge: null,
                          badgeColor: '',
                        };
                      case 'diary': {
                        const diaryDate = new Date(activity.data.date);
                        const formattedDate = isClient 
                          ? diaryDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
                          : activity.data.date;
                        return {
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                          ),
                          iconBg: 'bg-indigo-100 text-indigo-600',
                          title: 'Dagbok',
                          description: `${formattedDate}${activity.data.work_performed ? ` - ${activity.data.work_performed.substring(0, 50)}${activity.data.work_performed.length > 50 ? '...' : ''}` : ''}`,
                          badge: null,
                          badgeColor: '',
                        };
                      }
                      default:
                        return null;
                    }
                  };

                  const details = getActivityDetails();
                  if (!details) return null;

                  // Determine where to navigate based on activity type
                  const getNavigationPath = () => {
                    switch (activity.type) {
                      case 'time':
                        return '/dashboard/time';
                      case 'material':
                        return '/dashboard/materials';
                      case 'expense':
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
                      className={`p-4 transition-colors ${navigationPath ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-lg ${details.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          {details.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-gray-500 uppercase">{details.title}</span>
                                {activity.user_name && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-sm font-medium text-gray-900">{activity.user_name}</span>
                                  </>
                                )}
                                {activity.project && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-sm text-gray-600">{activity.project.name}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-sm text-gray-900 mt-0.5">
                                {details.description}
                              </div>
                            </div>
                            {details.badge && (
                              <div className={`text-sm font-semibold whitespace-nowrap ${details.badgeColor}`}>
                                {details.badge}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Show More button */}
              {recentActivities.length > 5 && (
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowAllActivities(!showAllActivities)}
                    className="w-full text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    {showAllActivities ? 'Visa färre' : `Visa fler (${recentActivities.length - 5} till)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="h-10" />

      <PageTourTrigger tourId="dashboard" />
    </div>
  );
}
