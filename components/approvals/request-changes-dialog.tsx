'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SimpleDialog } from '@/components/ui/simple-dialog';

type TimeEntry = {
    id: string;
    user: {
        full_name: string;
    };
    project: {
        name: string;
    };
    start_at: string;
    duration_min: number | null;
};

type RequestChangesDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: TimeEntry;
    onSuccess: () => void;
};

export function RequestChangesDialog({ 
    open, 
    onOpenChange, 
    entry,
    onSuccess 
}: RequestChangesDialogProps) {
    const [feedback, setFeedback] = useState('');

    const requestChangesMutation = useMutation({
        mutationFn: async () => {
            if (!feedback.trim()) {
                throw new Error('Feedback krävs för att begära ändringar');
            }

            const response = await fetch('/api/approvals/time-entries/request-changes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entry_id: entry.id,
                    feedback,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to request changes');
            }

            return response.json();
        },
        onSuccess: () => {
            toast.success('Ändringar begärda!');
            setFeedback('');
            onSuccess();
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Kunde inte skicka feedback');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        requestChangesMutation.mutate();
    };

    return (
        <SimpleDialog open={open} onOpenChange={onOpenChange}>
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold">Begär ändringar</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Skicka feedback till {entry.user.full_name} om vad som behöver ändras
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="text-sm font-medium">Projekt:</div>
                        <div className="text-sm text-muted-foreground">{entry.project.name}</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium">Datum:</div>
                        <div className="text-sm text-muted-foreground">
                            {new Date(entry.start_at).toLocaleDateString('sv-SE')}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium">Tid:</div>
                        <div className="text-sm text-muted-foreground">
                            {entry.duration_min ? `${Math.floor(entry.duration_min / 60)}:${(entry.duration_min % 60).toString().padStart(2, '0')}` : '-'}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="feedback">Feedback (obligatoriskt)</Label>
                        <Textarea
                            id="feedback"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Beskriv vad som behöver ändras..."
                            rows={5}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={requestChangesMutation.isPending}
                        >
                            Avbryt
                        </Button>
                        <Button
                            type="submit"
                            disabled={requestChangesMutation.isPending || !feedback.trim()}
                        >
                            {requestChangesMutation.isPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Skicka feedback
                        </Button>
                    </div>
                </form>
            </div>
        </SimpleDialog>
    );
}

