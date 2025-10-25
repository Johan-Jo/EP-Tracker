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
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const displayedActivities = showAllActivities ? recentActivities : recentActivities.slice(0, 5);

  // Prevent hydration mismatch for date formatting
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCheckIn = async (projectId: string) => {
    try {
      const response = await fetch('/api/time/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          start_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start time entry');
      }

      router.refresh();
    } catch (error) {
      console.error('Error starting time:', error);
      router.refresh();
    }
  };

  const handleCheckOut = async () => {
    if (!activeTimeEntry) return;

    try {
      const response = await fetch(`/api/time/entries/${activeTimeEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stop_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop time entry');
      }

      router.refresh();
    } catch (error) {
      console.error('Error stopping time:', error);
      router.refresh();
    }
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

      {/* Time Check-in/Check-out Slider */}
      <div className="mb-6 bg-gradient-to-r from-orange-50 to-orange-100/50 border-2 border-orange-200 rounded-xl p-4" data-tour="time-slider">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="leading-tight flex-1 min-w-0">
            <div className={activeTimeEntry ? "text-sm font-medium" : "text-base font-medium"}>
              {activeTimeEntry ? 'Aktiv tid' : 'Ingen aktiv tid'}
            </div>
          </div>
        </div>
        
        {/* Centered check-in info above timer */}
        {activeTimeEntry && activeTimeEntry.start_at && activeTimeEntry.projects?.name && (
          <div className="text-center text-sm text-gray-700 mb-2">
            Du checkade in <span className="font-bold">{new Date(activeTimeEntry.start_at).toLocaleTimeString('sv-SE', {
              hour: '2-digit',
              minute: '2-digit'
            })}</span>, projekt: <span className="font-bold text-orange-600">{activeTimeEntry.projects.name}</span>
          </div>
        )}
        <TimeSlider
          isActive={!!activeTimeEntry}
          projectName={
            activeTimeEntry 
              ? activeTimeEntry.projects?.name 
              : recentProject?.name
          }
          projectId={
            activeTimeEntry 
              ? activeTimeEntry.projects?.id 
              : recentProject?.id
          }
          startTime={activeTimeEntry?.start_at}
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
            onClick={() => setShowQuickStart(true)}
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-blue-300 bg-white text-blue-600 text-sm font-medium hover:bg-blue-50"
          >
            Visa guide
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

      {/* Quick Start Modal */}
      {showQuickStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Snabbstart</h2>
                <p className="text-sm text-gray-600 mt-1">Kom igång med EP Tracker på några minuter</p>
              </div>
              <button
                onClick={() => setShowQuickStart(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Step 1: Create Project */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-orange-300 transition-colors">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Skapa ditt första projekt</h3>
                  <p className="text-sm text-gray-600 mt-1">Alla tidsrapporter kopplas till ett projekt</p>
                </div>
                <button
                  onClick={() => {
                    setShowQuickStart(false);
                    router.push('/dashboard/projects/new');
                  }}
                  className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors flex-shrink-0"
                >
                  Skapa projekt
                </button>
              </div>

              {/* Step 2: Log Time */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-orange-300 transition-colors">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Logga din första tid</h3>
                  <p className="text-sm text-gray-600 mt-1">Starta timern eller lägg till manuell</p>
                </div>
                <button
                  onClick={() => {
                    setShowQuickStart(false);
                    router.push('/dashboard/time');
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors flex-shrink-0"
                >
                  Rapportera tid
                </button>
              </div>

              {/* Step 3: Invite Team */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-orange-300 transition-colors">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Bjud in ditt team</h3>
                  <p className="text-sm text-gray-600 mt-1">Lägg till kollegor i din organisation</p>
                </div>
                <button
                  onClick={() => {
                    setShowQuickStart(false);
                    router.push('/dashboard/settings/users');
                  }}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors flex-shrink-0"
                >
                  Hantera användare
                </button>
              </div>

              {/* Step 4: Approve Week */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-orange-300 transition-colors">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Godkänn första veckan</h3>
                  <p className="text-sm text-gray-600 mt-1">Granska och godkänn tidsrapporter för support</p>
                </div>
                <button
                  onClick={() => {
                    setShowQuickStart(false);
                    router.push('/dashboard/approvals');
                  }}
                  className="px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors flex-shrink-0"
                >
                  Gå till godkännanden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <PageTourTrigger tourId="dashboard" />
    </div>
  );
}
