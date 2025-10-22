"use client";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Clock, 
  Package, 
  Wrench, 
  FileText, 
  CheckSquare, 
  Users, 
  HelpCircle,
  Settings,
  UserCircle
} from 'lucide-react';

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

export function Sidebar({ activeItem = 'overview', onItemClick }: SidebarProps) {
  const mainMenuItems = [
    { id: 'overview', label: 'Översikt', icon: LayoutDashboard },
    { id: 'project', label: 'Projekt', icon: FolderKanban },
    { id: 'time', label: 'Tid', icon: Clock },
    { id: 'material', label: 'Material', icon: Package },
    { id: 'ata', label: 'ATA', icon: Wrench },
    { id: 'logbook', label: 'Dagbok', icon: FileText },
    { id: 'checklist', label: 'Checklista', icon: CheckSquare },
    { id: 'deviation', label: 'Godkännanden', icon: CheckSquare },
    { id: 'help', label: 'Hjälp', icon: HelpCircle },
  ];

  const adminMenuItems = [
    { id: 'organization', label: 'Organisation', icon: Settings },
    { id: 'users', label: 'Användare', icon: Users },
    { id: 'settings', label: 'Inställningar', icon: Settings },
  ];

  return (
    <div className="hidden md:flex h-full w-64 bg-sidebar border-r border-sidebar-border flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-foreground">EP Tracker</h1>
        <p className="text-muted-foreground text-sm mt-1">Tidsrapportering</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onItemClick?.(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-1'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Administration Section */}
        <div className="mt-8">
          <p className="px-3 mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Administration
          </p>
          <div className="space-y-1">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onItemClick?.(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-1'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50 transition-all duration-200 hover:shadow-sm">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-md ring-2 ring-primary/20">
            JJ
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="truncate">Johan Jonsson</p>
            <p className="text-sm text-muted-foreground truncate">johan@example.com</p>
          </div>
        </button>
      </div>
    </div>
  );
}

