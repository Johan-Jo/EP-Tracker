'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TimeSliderProps {
  isActive: boolean;
  projectName?: string;
  projectId?: string;
  startTime?: string;
  availableProjects?: Array<{ id: string; name: string }>;
  onCheckIn: (projectId: string) => Promise<void>;
  onCheckOut: (customStopAt?: string, customStartAt?: string) => Promise<void>;
  onCheckOutComplete?: (projectId: string) => void;
  onProjectChange?: (projectId: string) => void;
}

export function TimeSlider({ 
  isActive, 
  projectName, 
  projectId,
  startTime,
  availableProjects = [],
  onCheckIn, 
  onCheckOut,
  onCheckOutComplete,
  onProjectChange 
}: TimeSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNoProjectDialog, setShowNoProjectDialog] = useState(false);
  const [showCheckOutConfirmDialog, setShowCheckOutConfirmDialog] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editedStartAt, setEditedStartAt] = useState<string>('');
  const [editedStopAt, setEditedStopAt] = useState<string>('');
  const [timeError, setTimeError] = useState<string>('');
  const sliderRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const threshold = 0.7; // 70% to trigger action

  // Calculate elapsed time
  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedTime('00:00:00');
      return;
    }

    const updateTimer = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [isActive, startTime]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected project when prop changes
  useEffect(() => {
    setSelectedProjectId(projectId);
  }, [projectId]);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !sliderRef.current || !sliderRef.current.parentElement) return;
    
    const trackRect = sliderRef.current.parentElement.getBoundingClientRect();
    const relativeX = clientX - trackRect.left;
    const percentage = trackRect.width > 0 ? relativeX / trackRect.width : 0;
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    
    setPosition(clampedPercentage);
  };

  const handleEnd = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (position >= threshold) {
      if (isActive) {
        // Check out - show confirmation dialog instead of immediate checkout
        if (startTime) {
          // Initialize edited times with current values
          const startDateTime = new Date(startTime);
          const stopDateTime = new Date();
          
          // Format for datetime-local input (YYYY-MM-DDTHH:mm)
          const formatDateTimeLocal = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          };
          
          setEditedStartAt(formatDateTimeLocal(startDateTime));
          setEditedStopAt(formatDateTimeLocal(stopDateTime));
        }
        setShowCheckOutConfirmDialog(true);
        setPosition(0); // Reset slider position
      } else {
        // Check in - verify project exists
        setIsLoading(true);
        try {
          if (availableProjects.length === 0) {
            setShowNoProjectDialog(true);
            setPosition(0);
            setIsLoading(false);
            return;
          }
          
          if (!selectedProjectId) {
            setPosition(0);
            setIsLoading(false);
            return;
          }
          await onCheckIn(selectedProjectId);
        } catch (error) {
          console.error('Error checking in:', error);
        } finally {
          setIsLoading(false);
          setPosition(0);
        }
      }
    } else {
      setPosition(0);
    }
  };

  const handleConfirmCheckOut = async () => {
    // Validate times if editing
    if (isEditingTime) {
      if (!editedStartAt || !editedStopAt) {
        setTimeError('Både check-in och check-out måste anges');
        return;
      }
      
      const start = new Date(editedStartAt);
      const stop = new Date(editedStopAt);
      
      if (stop <= start) {
        setTimeError('Check-out måste vara efter check-in');
        return;
      }
      
      setTimeError('');
    }
    
    setIsLoading(true);
    try {
      const currentProjectId = projectId;
      
      // Use edited times if in edit mode, otherwise use defaults
      const stopAt = isEditingTime && editedStopAt 
        ? new Date(editedStopAt).toISOString()
        : undefined;
      const startAt = isEditingTime && editedStartAt 
        ? new Date(editedStartAt).toISOString()
        : undefined;
      
      await onCheckOut(stopAt, startAt);
      
      // Close dialog and notify parent
      setShowCheckOutConfirmDialog(false);
      setIsEditingTime(false);
      setTimeError('');
      
      // Notify parent component about check-out completion
      if (currentProjectId && onCheckOutComplete) {
        setTimeout(() => {
          onCheckOutComplete(currentProjectId);
        }, 100);
      }
    } catch (error) {
      console.error('Error checking out:', error);
      setTimeError('Ett fel uppstod vid checkout. Försök igen.');
    } finally {
      setIsLoading(false);
      setPosition(0);
    }
  };

  const handleCancelCheckOut = () => {
    setShowCheckOutConfirmDialog(false);
    setIsEditingTime(false);
    setTimeError('');
    setPosition(0);
  };

  const handleEditTime = () => {
    setIsEditingTime(true);
    setTimeError('');
  };

  const calculateTotalTime = () => {
    if (!startTime) return '00:00:00';
    
    const start = isEditingTime && editedStartAt 
      ? new Date(editedStartAt)
      : new Date(startTime);
    const stop = isEditingTime && editedStopAt
      ? new Date(editedStopAt)
      : new Date();
    
    const diff = Math.floor((stop.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    setShowDropdown(false);
    onProjectChange?.(id);
  };

  const selectedProject = availableProjects.find(p => p.id === selectedProjectId) || 
    (projectName && projectId ? { id: projectId, name: projectName } : null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const handleMouseUp = () => handleEnd();
    const handleTouchEnd = () => handleEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, position]);

  const bgColor = isActive 
    ? 'bg-orange-500' 
    : 'bg-gray-100';
  
  const textColor = isActive ? 'text-white' : 'text-gray-700';
  const borderColor = isActive ? 'border-orange-500' : 'border-orange-500';
  
  const label = isActive ? 'Swipa för att checka ut' : 'Swipa för att checka in';

  return (
    <>
      {/* No Project Dialog */}
      <Dialog open={showNoProjectDialog} onOpenChange={setShowNoProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inget projekt hittades</DialogTitle>
            <DialogDescription>
              Du måste skapa ett projekt för att kunna starta timern.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Vill du skapa ett projekt nu?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNoProjectDialog(false)}
                className="flex-1"
              >
                Avbryt
              </Button>
              <Link href="/dashboard/projects/new" className="flex-1">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  Skapa projekt
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Confirmation Dialog */}
      <Dialog open={showCheckOutConfirmDialog} onOpenChange={handleCancelCheckOut}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bekräfta checkout</DialogTitle>
            <DialogDescription>
              Kontrollera tiden för din arbetsdag innan du checkar ut.
            </DialogDescription>
          </DialogHeader>
          
          {!isEditingTime ? (
            // Confirmation view - show times and question
            <div className="flex flex-col gap-4 mt-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-700">Check in:</span>
                  <span className="text-sm font-semibold">
                    {startTime ? formatTime(startTime) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-700">Check out:</span>
                  <span className="text-sm font-semibold">
                    {formatTime(new Date().toISOString())}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-orange-50 rounded-lg px-3">
                  <span className="text-sm font-semibold text-gray-900">Totalt arbetad tid:</span>
                  <span className="text-lg font-bold text-orange-600">
                    {calculateTotalTime()}
                  </span>
                </div>
              </div>
              
              <p className="text-base font-medium text-center py-2">
                Stämmer tiden för din arbetsdag?
              </p>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCancelCheckOut}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Avbryt
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEditTime}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Nej, editera
                </Button>
                <Button
                  onClick={handleConfirmCheckOut}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    'Ja, spara'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Edit view - show editable time inputs
            <div className="flex flex-col gap-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start_at">Check in</Label>
                  <Input
                    id="start_at"
                    type="datetime-local"
                    value={editedStartAt}
                    onChange={(e) => {
                      setEditedStartAt(e.target.value);
                      setTimeError(''); // Clear error when user edits
                    }}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stop_at">Check out</Label>
                  <Input
                    id="stop_at"
                    type="datetime-local"
                    value={editedStopAt}
                    onChange={(e) => {
                      setEditedStopAt(e.target.value);
                      setTimeError(''); // Clear error when user edits
                    }}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between items-center py-2 bg-orange-50 rounded-lg px-3">
                  <span className="text-sm font-semibold text-gray-900">Totalt arbetad tid:</span>
                  <span className="text-lg font-bold text-orange-600">
                    {calculateTotalTime()}
                  </span>
                </div>
                {timeError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {timeError}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingTime(false);
                    setTimeError('');
                  }}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Tillbaka
                </Button>
                <Button
                  onClick={handleConfirmCheckOut}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isLoading || !editedStartAt || !editedStopAt || !!timeError}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    'Spara och checka ut'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="w-full space-y-2">
        {/* Timer display when active */}
        {isActive && (
          <div className="flex items-center justify-center py-2">
            <div className="text-4xl font-mono font-bold text-gray-900 tracking-wider">
              {elapsedTime}
            </div>
          </div>
        )}

      {/* Project selector dropdown */}
      {!isActive && availableProjects.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">
                {isActive ? 'Arbetar på:' : 'Starta tid för:'}
              </span>
              <span className="text-sm font-semibold text-orange-600">
                {selectedProject?.name || 'Välj projekt'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {availableProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${
                    selectedProjectId === project.id ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slider */}
      <div
        ref={sliderRef}
        className={`relative h-14 rounded-full ${bgColor} border-2 ${borderColor} cursor-pointer select-none transition-all duration-300`}
      >
        {/* Background text */}
        <div className={`absolute inset-0 flex items-center justify-center ${textColor} font-medium text-sm pointer-events-none z-0`}>
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span style={{ opacity: Math.max(0, 1 - position * 2) }}>
              {label}
            </span>
          )}
        </div>

        {/* Sliding thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-12 w-12 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing z-10 overflow-hidden"
          style={{
            left: `calc(${position * 100}% - ${position * 48}px)`,
            transition: isDragging ? 'none' : 'left 0.3s ease-out'
          }}
          onMouseDown={(e) => handleStart(e.clientX)}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        >
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="w-6 h-6 text-gray-600"
            style={{
              transform: `scale(${1 + position * 0.2})`
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>
    </>
  );
}
