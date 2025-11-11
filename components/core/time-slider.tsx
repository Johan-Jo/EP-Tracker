'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronRight, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeInput } from '@/components/ui/time-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { billingTypeOptions, type BillingType } from '@/lib/schemas/billing-types';

type ProjectOption = {
  id: string;
  name: string;
  billing_mode: 'FAST_ONLY' | 'LOPANDE_ONLY' | 'BOTH';
  default_time_billing_type: BillingType;
};

type FixedBlockOption = {
  id: string;
  name: string;
  amount_sek: number;
  status: 'open' | 'closed';
};

interface TimeSliderProps {
  isActive: boolean;
  projectName?: string;
  projectId?: string;
  startTime?: string;
  activeBillingType?: BillingType | null;
  availableProjects?: ProjectOption[];
  onCheckIn: (projectId: string, billingType: BillingType, fixedBlockId?: string | null) => Promise<void>;
  onCheckOut: (customStopAt?: string, customStartAt?: string) => Promise<void>;
  onCheckOutComplete?: (projectId: string) => void;
  onProjectChange?: (projectId: string) => void;
}

export function TimeSlider({ 
  isActive, 
  projectName, 
  projectId,
  startTime,
  activeBillingType = null,
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
  const [selectedBillingType, setSelectedBillingType] = useState<BillingType | null>(null);
  const [selectedFixedBlockId, setSelectedFixedBlockId] = useState<string>('');
  const [fixedBlocks, setFixedBlocks] = useState<FixedBlockOption[]>([]);
  const [fixedBlocksLoading, setFixedBlocksLoading] = useState(false);
  const [fixedBlocksError, setFixedBlocksError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [showDropdown, setShowDropdown] = useState(false);
  const [billingSelectionError, setBillingSelectionError] = useState<string | null>(null);
  const [showNoProjectDialog, setShowNoProjectDialog] = useState(false);
  const [showCheckOutConfirmDialog, setShowCheckOutConfirmDialog] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editedStartAt, setEditedStartAt] = useState<string>('');
  const [editedStopAt, setEditedStopAt] = useState<string>('');
  const [editedStartTime, setEditedStartTime] = useState<string>('');
  const [editedStopTime, setEditedStopTime] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [timeError, setTimeError] = useState<string>('');
  const sliderRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const threshold = 0.7; // 70% to trigger action

  const selectedProjectDetails = useMemo(
    () => availableProjects.find((p) => p.id === selectedProjectId) ?? null,
    [availableProjects, selectedProjectId],
  );

  const billingPreferenceKey = useMemo(() => {
    return selectedProjectDetails ? `project-billing-pref:${selectedProjectDetails.id}` : null;
  }, [selectedProjectDetails?.id]);

  useEffect(() => {
    if (!selectedProjectDetails) {
      setSelectedBillingType(null);
      setSelectedFixedBlockId('');
      setFixedBlocks([]);
      setFixedBlocksError(null);
      setBillingSelectionError(null);
      return;
    }

    if (isActive && activeBillingType) {
      setSelectedBillingType(activeBillingType);
      setBillingSelectionError(null);
      return;
    }

    switch (selectedProjectDetails.billing_mode) {
      case 'FAST_ONLY':
        setSelectedBillingType('FAST');
        setBillingSelectionError(null);
        break;
      case 'LOPANDE_ONLY':
        setSelectedBillingType('LOPANDE');
        setBillingSelectionError(null);
        break;
      case 'BOTH':
        if (billingPreferenceKey && typeof window !== 'undefined') {
          const stored = window.localStorage.getItem(billingPreferenceKey);
          if (stored === 'FAST' || stored === 'LOPANDE') {
            setSelectedBillingType(stored as BillingType);
            setBillingSelectionError(null);
            break;
          }
        }
        setSelectedBillingType(null);
        setBillingSelectionError(null);
        break;
      default:
        setSelectedBillingType('LOPANDE');
        setBillingSelectionError(null);
    }
  }, [selectedProjectDetails, billingPreferenceKey, isActive, activeBillingType]);

  useEffect(() => {
    if (!billingPreferenceKey) return;
    if (selectedProjectDetails?.billing_mode !== 'BOTH') return;
    if (selectedBillingType === 'FAST' || selectedBillingType === 'LOPANDE') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(billingPreferenceKey, selectedBillingType);
      }
    }
  }, [selectedBillingType, billingPreferenceKey, selectedProjectDetails?.billing_mode]);

useEffect(() => {
  if (
    !selectedProjectDetails ||
    (selectedProjectDetails.billing_mode !== 'FAST_ONLY' &&
      selectedProjectDetails.billing_mode !== 'BOTH')
  ) {
    setFixedBlocks([]);
    setSelectedFixedBlockId('');
    setFixedBlocksError(null);
    return;
  }

  let isCancelled = false;
  const loadFixedBlocks = async () => {
    try {
      setFixedBlocksLoading(true);
      setFixedBlocksError(null);
      const response = await fetch(`/api/fixed-time-blocks?projectId=${selectedProjectDetails.id}`);
      if (!response.ok) throw new Error('Kunde inte hämta fasta poster');
      const json = await response.json();
      if (!isCancelled) {
        setFixedBlocks(json.blocks || []);
      }
    } catch (error) {
      if (!isCancelled) {
        console.error(error);
        setFixedBlocksError(error instanceof Error ? error.message : 'Ett fel uppstod');
        setFixedBlocks([]);
      }
    } finally {
      if (!isCancelled) setFixedBlocksLoading(false);
    }
  };

  loadFixedBlocks();

  return () => {
    isCancelled = true;
  };
}, [selectedProjectDetails]);

useEffect(() => {
  if (selectedBillingType !== 'FAST') {
    setSelectedFixedBlockId('');
  }
}, [selectedBillingType]);

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

  const requiresBillingSelection =
    !isActive &&
    selectedProjectDetails?.billing_mode === 'BOTH' &&
    !selectedBillingType;

  const sliderDisabled =
    (!isActive && !selectedProjectId) || requiresBillingSelection;

  const handleStart = (clientX: number) => {
    if (sliderDisabled) {
      if (!selectedBillingType && selectedProjectDetails?.billing_mode === 'BOTH') {
        setBillingSelectionError('Välj debiteringsform för att starta tid.');
      }
      return;
    }
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
          
          // Format date (YYYY-MM-DD) - read only
          const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          // Format time (HH:mm) - editable
          const formatTimeOnly = (date: Date) => {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
          };
          
          // Store full datetime strings for API calls (kept for backward compatibility)
          setEditedStartAt(startDateTime.toISOString());
          setEditedStopAt(stopDateTime.toISOString());
          
          // Store date and time separately for UI
          setStartDate(formatDate(startDateTime));
          setEditedStartTime(formatTimeOnly(startDateTime));
          setEditedStopTime(formatTimeOnly(stopDateTime));
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
          const billingToUse = selectedBillingType;

          if (!billingToUse) {
            setBillingSelectionError('Välj debiteringsform för att starta tid.');
            setPosition(0);
            setIsLoading(false);
            return;
          }

          if (
            billingToUse === 'FAST' &&
            (!selectedFixedBlockId || fixedBlocks.length === 0)
          ) {
            alert('Välj en fast post innan du checkar in på fast debitering.');
            setPosition(0);
            setIsLoading(false);
            return;
          }

          await onCheckIn(
            selectedProjectId,
            billingToUse,
            billingToUse === 'FAST' ? selectedFixedBlockId : null,
          );
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
      if (!editedStartTime || !editedStopTime) {
        setTimeError('Både check-in och check-out måste anges');
        return;
      }
      
      // Combine date with edited times
      const [startHours, startMinutes] = editedStartTime.split(':').map(Number);
      const [stopHours, stopMinutes] = editedStopTime.split(':').map(Number);
      
      const startDateObj = new Date(startDate + 'T' + editedStartTime + ':00');
      const stopDateObj = new Date(startDate + 'T' + editedStopTime + ':00');
      
      // If stop time is earlier than start time, assume it's next day
      if (stopDateObj <= startDateObj) {
        const nextDay = new Date(startDateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(stopHours, stopMinutes, 0, 0);
        stopDateObj.setTime(nextDay.getTime());
      }
      
      // Store the combined datetime strings
      setEditedStartAt(startDateObj.toISOString());
      setEditedStopAt(stopDateObj.toISOString());
      
      if (stopDateObj <= startDateObj && !(stopDateObj.getDate() > startDateObj.getDate())) {
        setTimeError('Check-out måste vara efter check-in');
        return;
      }
      
      setTimeError('');
    }
    
    setIsLoading(true);
    try {
      const currentProjectId = projectId;
      
      // Use edited times if in edit mode, otherwise use defaults
      let stopAt: string | undefined;
      let startAt: string | undefined;
      
      if (isEditingTime) {
        // Reconstruct datetime strings from date + time
        const [startHours, startMinutes] = editedStartTime.split(':').map(Number);
        const [stopHours, stopMinutes] = editedStopTime.split(':').map(Number);
        
        const startDateObj = new Date(startDate + 'T' + editedStartTime + ':00');
        let stopDateObj = new Date(startDate + 'T' + editedStopTime + ':00');
        
        // If stop time is earlier than start time, assume it's next day
        if (stopDateObj <= startDateObj) {
          const nextDay = new Date(startDateObj);
          nextDay.setDate(nextDay.getDate() + 1);
          nextDay.setHours(stopHours, stopMinutes, 0, 0);
          stopDateObj = nextDay;
        }
        
        stopAt = stopDateObj.toISOString();
        startAt = startDateObj.toISOString();
      }
      
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
    setEditedStartTime('');
    setEditedStopTime('');
    setStartDate('');
    setPosition(0);
  };

  const handleEditTime = () => {
    setIsEditingTime(true);
    setTimeError('');
  };

  const calculateTotalTime = () => {
    if (!startTime) return '00:00:00';
    
    let start: Date;
    let stop: Date;
    
    if (isEditingTime && editedStartTime && editedStopTime) {
      // Use edited times combined with the date
      const [startHours, startMinutes] = editedStartTime.split(':').map(Number);
      const [stopHours, stopMinutes] = editedStopTime.split(':').map(Number);
      
      start = new Date(startDate + 'T' + editedStartTime + ':00');
      stop = new Date(startDate + 'T' + editedStopTime + ':00');
      
      // If stop time is earlier than start time, assume it's next day
      if (stop <= start) {
        const nextDay = new Date(start);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(stopHours, stopMinutes, 0, 0);
        stop = nextDay;
      }
    } else {
      start = new Date(startTime);
      stop = new Date();
    }
    
    const diff = Math.floor((stop.getTime() - start.getTime()) / 1000);
    if (diff < 0) return '00:00:00';
    
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
  setSelectedFixedBlockId('');
  setFixedBlocks([]);
  setFixedBlocksError(null);
    onProjectChange?.(id);
  };

  const selectedProject =
    selectedProjectDetails ||
    (projectName && projectId
      ? {
          id: projectId,
          name: projectName,
          billing_mode: activeBillingType === 'FAST' ? 'FAST_ONLY' : 'LOPANDE_ONLY',
          default_time_billing_type: activeBillingType ?? 'LOPANDE',
        }
      : null);

const showFixedBlockPicker =
  !!selectedProjectDetails &&
  selectedBillingType === 'FAST' &&
  (selectedProjectDetails.billing_mode === 'FAST_ONLY' ||
    selectedProjectDetails.billing_mode === 'BOTH');

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
    ? 'bg-gradient-to-r from-orange-500 to-orange-600 dark:from-[#ff7a29] dark:via-[#ff6315] dark:to-[#ff4d00]' 
    : 'bg-gray-100 dark:bg-[linear-gradient(115deg,#4b3624_0%,#2d2219_35%,#1d1611_100%)]';
  
  const textColor = isActive
    ? 'text-white dark:text-white dark:[text-shadow:0_1px_1px_rgba(0,0,0,0.55)]'
    : 'text-gray-700 dark:text-[#ffe5c7] dark:[text-shadow:0_1px_1px_rgba(0,0,0,0.55)]';
  const borderColor = isActive ? 'border-orange-500 dark:border-[#ff7a29]' : 'border-orange-300 dark:border-[#ff7a29]/45';
  
  const label = isActive
    ? 'Swipa för att checka ut'
    : requiresBillingSelection
    ? 'Välj debiteringsform'
    : 'Swipa för att checka in';

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
            // Edit view - show editable time inputs (date is read-only)
            <div className="flex flex-col gap-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Datum</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    disabled
                    className="w-full bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <TimeInput
                    value={editedStartTime}
                    onChange={(value) => {
                      setEditedStartTime(value);
                      setTimeError(''); // Clear error when user edits
                    }}
                    label="Check in"
                    disabled={isLoading}
                  />
                  <TimeInput
                    value={editedStopTime}
                    onChange={(value) => {
                      setEditedStopTime(value);
                      setTimeError(''); // Clear error when user edits
                    }}
                    label="Check out"
                    disabled={isLoading}
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
                  disabled={isLoading || !editedStartTime || !editedStopTime || !!timeError}
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
            <div className="text-4xl font-mono font-bold text-[#2f1f13] tracking-wider dark:text-white dark:[text-shadow:0_2px_6px_rgba(0,0,0,0.5)]">
              {elapsedTime}
            </div>
          </div>
        )}

      {/* Project selector dropdown */}
      {!isActive && availableProjects.length > 0 && (
        <div className="space-y-3">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-300 transition-colors dark:bg-[#1f140d] dark:border-[#ff8a3d]/35 dark:hover:border-[#ff8a3d]/55"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 dark:text-[#ffe5c7] dark:[text-shadow:0_1px_1px_rgba(0,0,0,0.55)]">
                  {isActive ? 'Arbetar på:' : 'Starta tid för:'}
                </span>
                <span className="text-sm font-semibold text-orange-600 dark:text-[#ffb778] dark:[text-shadow:0_1px_1px_rgba(0,0,0,0.35)]">
                  {selectedProject?.name || 'Välj projekt'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform dark:text-white/60 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border-2 border-gray-200 bg-white shadow-lg dark:border-[#ff8a3d]/35 dark:bg-[#1f140d]">
                {availableProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project.id)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10 ${
                      selectedProjectId === project.id
                        ? 'bg-orange-50 text-orange-600 font-medium dark:bg-[#372113] dark:text-[#ffcb96]'
                        : 'text-gray-700 dark:text-[#ffe6cc]'
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProjectDetails && (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm dark:border-[#ff8a3d]/30 dark:bg-[#1f140d]">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-[#f5cca8]/70">
                <span>Projekt</span>
                <span>
                  {selectedProjectDetails.billing_mode === 'FAST_ONLY'
                    ? 'Fast'
                    : selectedProjectDetails.billing_mode === 'LOPANDE_ONLY'
                    ? 'Löpande'
                    : 'Löpande & Fast'}
                </span>
              </div>

              {selectedProjectDetails.billing_mode === 'BOTH' ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-[#ffe5c7]">
                    Debitering
                  </label>
                  <Select
                    value={selectedBillingType ?? undefined}
                    onValueChange={(value) => {
                      setSelectedBillingType(value as BillingType);
                      setBillingSelectionError(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj debitering" />
                    </SelectTrigger>
                    <SelectContent>
                      {billingTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {billingSelectionError && (
                    <p className="text-[11px] text-destructive">{billingSelectionError}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Debitering: {selectedProjectDetails.billing_mode === 'FAST_ONLY' ? 'Fast' : 'Löpande'}
                </div>
              )}

              {showFixedBlockPicker && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-[#ffe5c7]">
                    Fast post
                  </label>
                  <Select
                    value={selectedFixedBlockId ?? undefined}
                    onValueChange={setSelectedFixedBlockId}
                    disabled={fixedBlocksLoading || fixedBlocks.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj fast post" />
                    </SelectTrigger>
                    <SelectContent>
                      {fixedBlocksLoading && (
                        <SelectItem value="__loading" disabled>
                          Laddar...
                        </SelectItem>
                      )}
                      {!fixedBlocksLoading && fixedBlocks.length > 0 ? (
                        fixedBlocks.map((block) => (
                          <SelectItem key={block.id} value={block.id}>
                            {block.name} ({Math.round(Number(block.amount_sek || 0))} SEK)
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__no_blocks_available" disabled>
                          Inga fasta poster – skapa i projektet
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {fixedBlocksError && (
                    <p className="text-xs text-red-600">{fixedBlocksError}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Fast tid måste kopplas till en fast post.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Slider */}
      <div
        ref={sliderRef}
        className={`relative h-14 overflow-hidden rounded-full ${bgColor} border-2 ${borderColor} ${
          sliderDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } select-none transition-all duration-300`}
      >
        <div className="pointer-events-none absolute inset-0 z-0 opacity-30 dark:opacity-40 bg-[radial-gradient(circle_at_20%_40%,rgba(255,255,255,0.22),transparent_55%),radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.18),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-1 bg-white/20 dark:bg-white/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1 bg-black/10 dark:bg-black/40" />

        {/* Background text */}
        <div className={`absolute inset-0 z-10 flex items-center justify-center ${textColor} pointer-events-none text-sm font-medium uppercase tracking-[0.18em]`}>
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
          className="absolute top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-md cursor-grab active:cursor-grabbing dark:border-transparent dark:bg-[radial-gradient(circle_at_30%_30%,#ffe3c3_0%,#ff8c38_45%,#cc3d00_100%)] dark:shadow-[0_12px_28px_rgba(255,100,30,0.45)]"
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
            className="h-6 w-6 text-gray-600 dark:text-[#2d1507]"
            style={{
              transform: `scale(${1 + position * 0.2})`
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
      {requiresBillingSelection && (
        <p className="text-xs font-medium text-orange-600 text-center">
          Välj debiteringsform innan du startar tid.
        </p>
      )}
    </div>
    </>
  );
}
