"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DashboardClientProps {
  userName: string;
  stats: {
    projectsCount: number;
    timeEntriesCount: number;
    materialsCount: number;
  };
}

export function DashboardClient({ userName, stats }: DashboardClientProps) {
  const router = useRouter();
  const [showQuickStart, setShowQuickStart] = useState(false);

  return (
    <div className="p-4 sm:p-6">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Välkommen, {userName}! <span className="align-middle">👋</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Här är en översikt över dina projekt och aktiviteter.
        </p>
      </div>

      {/* No Active Time Banner - ORANGE GRADIENT */}
      <div className="mb-6 bg-gradient-to-r from-orange-50 to-orange-100/50 border-2 border-orange-200 rounded-xl p-5 sm:p-6 hover:shadow-md hover:border-orange-300 transition-all duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="font-medium">Ingen aktiv tid</div>
              <div className="text-sm text-gray-600">Vad jobbar du med nu?</div>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard/time')}
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
          >
            Start
          </button>
        </div>
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
      <div className="mt-6">
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
    </div>
  );
}
