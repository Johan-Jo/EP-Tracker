'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, Loader2, ChevronDown } from 'lucide-react';

interface TimeSliderProps {
  isActive: boolean;
  projectName?: string;
  projectId?: string;
  startTime?: string;
  availableProjects?: Array<{ id: string; name: string }>;
  onCheckIn: (projectId: string) => Promise<void>;
  onCheckOut: () => Promise<void>;
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
  onProjectChange 
}: TimeSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [showDropdown, setShowDropdown] = useState(false);
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
      setIsLoading(true);
      try {
        if (isActive) {
          await onCheckOut();
        } else {
          if (!selectedProjectId) {
            setPosition(0);
            setIsLoading(false);
            return;
          }
          await onCheckIn(selectedProjectId);
        }
      } catch (error) {
        console.error('Error toggling time:', error);
      } finally {
        setIsLoading(false);
        setPosition(0);
      }
    } else {
      setPosition(0);
    }
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
          className="absolute top-1/2 -translate-y-1/2 h-12 w-12 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
          style={{
            left: `calc(${position * 100}% - ${position * 48}px)`,
            transition: isDragging ? 'none' : 'left 0.3s ease-out'
          }}
          onMouseDown={(e) => handleStart(e.clientX)}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        >
          <ChevronRight 
            className="w-6 h-6 text-gray-600"
            style={{
              transform: `scale(${1 + position * 0.2})`
            }}
          />
        </div>
      </div>
    </div>
  );
}
