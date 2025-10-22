"use client";
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-primary',
  onClick
}: StatsCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group bg-card rounded-xl border-2 border-border p-4 md:p-6 hover:shadow-lg hover:border-primary/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground mb-2">{title}</p>
          <p className="text-2xl md:text-3xl mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <div className={`p-1.5 md:p-2 rounded-lg bg-accent group-hover:bg-accent/80 ${iconColor} shrink-0 transition-colors`}>
          <Icon className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
        </div>
      </div>
    </div>
  );
}

