"use client";
import { useState } from 'react';
import { Plus, Clock, Package, FolderKanban, AlertCircle, Bell, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard } from './StatsCard';
import { QuickStartDialog } from './QuickStartDialog';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const [showQuickStart, setShowQuickStart] = useState(false);

  return (
    <div className="flex-1 overflow-auto pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-4">
            <h2 className="md:hidden">EP Tracker</h2>
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Synkat</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button className="relative p-2 hover:bg-muted rounded-lg transition-all duration-200 hover:scale-110 active:scale-95">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </button>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer ring-2 ring-primary/20">
              JJ
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-4 md:py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="mb-2">Välkommen, Johan! 👋</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Här är en översikt över dina projekt och aktiviteter.
          </p>
        </div>

        {/* Quick Start Banner */}
        <div className="mb-6 md:mb-8 bg-card rounded-xl border border-border p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0 md:justify-between">
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <div className="p-2 md:p-3 rounded-lg bg-accent shrink-0">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm md:text-base">Ingen aktiv tid</p>
              <p className="text-xs md:text-sm text-muted-foreground">Vad jobbar du med nu?</p>
            </div>
          </div>
          <Button 
            variant="default"
            onClick={() => setShowQuickStart(true)}
            className="shrink-0 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200"
          >
            Start
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 md:mb-8">
          <h3 className="mb-3 md:mb-4">Snabbåtgärder</h3>
          <p className="text-sm text-muted-foreground mb-3 md:mb-4">
            Vanliga uppgifter för att komma igång snabbt
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <button 
              onClick={() => onNavigate?.('project')}
              className="group bg-primary text-primary-foreground rounded-xl p-4 md:p-6 flex items-center gap-3 md:gap-4 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-200 text-left active:scale-[0.98]"
            >
              <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                <Plus className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-sm md:text-base">Nytt projekt</p>
                <p className="text-xs text-primary-foreground/70 mt-0.5">Skapa ett nytt projekt</p>
              </div>
            </button>
            
            <button 
              onClick={() => onNavigate?.('time')}
              className="group bg-card border-2 border-border rounded-xl p-4 md:p-6 flex items-center gap-3 md:gap-4 hover:border-primary/50 hover:bg-accent/50 hover:shadow-md hover:scale-[1.02] transition-all duration-200 text-left active:scale-[0.98]"
            >
              <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm md:text-base">Logga tid</p>
                <p className="text-xs text-muted-foreground mt-0.5">Registrera arbetstid</p>
              </div>
            </button>
            
            <button 
              onClick={() => onNavigate?.('material')}
              className="group bg-card border-2 border-border rounded-xl p-4 md:p-6 flex items-center gap-3 md:gap-4 hover:border-primary/50 hover:bg-accent/50 hover:shadow-md hover:scale-[1.02] transition-all duration-200 text-left active:scale-[0.98]"
            >
              <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                <Package className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm md:text-base">Lägg till material</p>
                <p className="text-xs text-muted-foreground mt-0.5">Hantera material</p>
              </div>
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-6 md:mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <StatsCard
              title="Aktiva Projekt"
              value="1"
              subtitle="Visa alla projekt →"
              icon={FolderKanban}
              iconColor="text-blue-600"
              onClick={() => onNavigate?.('project')}
            />
            
            <StatsCard
              title="Tidsrapporter denna vecka"
              value="0"
              subtitle="Logga tid →"
              icon={Clock}
              iconColor="text-green-600"
              onClick={() => onNavigate?.('time')}
            />
            
            <StatsCard
              title="Material & Utgifter denna vecka"
              value="2"
              subtitle="Hantera material & utgifter →"
              icon={Package}
              iconColor="text-orange-600"
              onClick={() => onNavigate?.('material')}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="mb-3 md:mb-4">Senaste aktivitet</h3>
          <div className="bg-card rounded-xl border border-border p-6 md:p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted mb-3 md:mb-4">
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm md:text-base">Ingen aktivitet ännu</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-2">
              Börja logga tid eller skapa ett projekt för att se din aktivitet här
            </p>
          </div>
        </div>
      </main>

      {/* Quick Start Dialog */}
      <QuickStartDialog 
        open={showQuickStart} 
        onClose={() => setShowQuickStart(false)} 
      />
    </div>
  );
}

