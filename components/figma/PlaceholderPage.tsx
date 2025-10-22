"use client";
import { LucideIcon, Bell, CheckCircle } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon: LucideIcon;
}

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
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
            <button className="relative p-2 hover:bg-muted rounded-lg transition-all duration-200">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </button>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm shadow-md ring-2 ring-primary/20">
              JJ
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-4 md:py-8 max-w-7xl">
        <div className="mb-6 md:mb-8">
          <h1 className="mb-2">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm md:text-base">{description}</p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted mb-4">
            <Icon className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Denna sida är under utveckling</p>
          <p className="text-sm text-muted-foreground mt-2">
            Funktionalitet kommer snart att vara tillgänglig här
          </p>
        </div>
      </main>
    </div>
  );
}

