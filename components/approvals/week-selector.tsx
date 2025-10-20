'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type WeekSelectorProps = {
    selectedWeek: Date;
    onWeekChange: (week: Date) => void;
};

export function WeekSelector({ selectedWeek, onWeekChange }: WeekSelectorProps) {
    const weekEnd = new Date(selectedWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const goToPreviousWeek = () => {
        const newWeek = new Date(selectedWeek);
        newWeek.setDate(newWeek.getDate() - 7);
        onWeekChange(newWeek);
    };

    const goToNextWeek = () => {
        const newWeek = new Date(selectedWeek);
        newWeek.setDate(newWeek.getDate() + 7);
        onWeekChange(newWeek);
    };

    const goToCurrentWeek = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        onWeekChange(monday);
    };

    const getWeekNumber = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const weekNumber = getWeekNumber(selectedWeek);

    return (
        <div className="flex items-center justify-between">
            <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
            >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Föregående vecka
            </Button>

            <div className="text-center">
                <div className="text-lg font-semibold">
                    Vecka {weekNumber}, {selectedWeek.getFullYear()}
                </div>
                <div className="text-sm text-muted-foreground">
                    {selectedWeek.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToCurrentWeek}
                    className="mt-2"
                >
                    Denna vecka
                </Button>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
            >
                Nästa vecka
                <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
        </div>
    );
}

