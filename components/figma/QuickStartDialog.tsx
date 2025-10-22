"use client";
import { useState } from 'react';
import { X, Plus, Clock, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickStartDialogProps {
  open: boolean;
  onClose: () => void;
}

export function QuickStartDialog({ open, onClose }: QuickStartDialogProps) {
  if (!open) return null;

  const steps = [
    {
      id: 1,
      title: 'Skapa ditt första projekt',
      description: 'Alla tidsrapporter kopplas till ett projekt',
      action: 'Skapa projekt',
      completed: false
    },
    {
      id: 2,
      title: 'Logga din första tid',
      description: 'Starta timern eller lägg till manuell',
      action: 'Rapportera tid',
      completed: false
    },
    {
      id: 3,
      title: 'Bjud in ditt team',
      description: 'Lägg till kollegor i din organisation',
      action: 'Hantera användare',
      completed: false
    },
    {
      id: 4,
      title: 'Godkänn första veckan',
      description: 'Granska och godkänn tidsrapporter för support',
      action: 'Gå till godkännanden',
      completed: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-start md:justify-center md:pt-20 px-0 md:px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-3xl bg-white rounded-t-2xl md:rounded-xl shadow-2xl max-h-[90vh] md:max-h-none overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-4 md:p-6 border-b border-border sticky top-0 bg-white z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl">Snabbstart</h2>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">
              Kom igång med EP Tracker på några minuter
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 hover:rotate-90 active:scale-90 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex flex-col md:flex-row items-start gap-3 md:gap-4 p-3 md:p-4 border border-border rounded-lg hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3 md:gap-4 flex-1 w-full md:w-auto">
                {/* Radio/Checkbox */}
                <div className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 mt-0.5 shrink-0">
                  <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-muted-foreground" />
                </div>

                {/* Icon */}
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg bg-muted shrink-0">
                  {step.id === 1 && <Plus className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />}
                  {step.id === 2 && <Clock className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />}
                  {step.id === 3 && <Users className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />}
                  {step.id === 4 && <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-base">{step.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>

              {/* Action Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="shrink-0 w-full md:w-auto hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all duration-200 hover:shadow-md"
              >
                {step.action}
              </Button>
            </div>
          ))}
        </div>
        
        {/* Bottom spacing for mobile safe area */}
        <div className="h-20 md:hidden" />
      </div>
    </div>
  );
}

