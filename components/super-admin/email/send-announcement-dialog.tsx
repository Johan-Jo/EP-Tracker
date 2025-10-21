'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';

interface SendAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrganizationIds: string[];
  onSuccess?: () => void;
}

export function SendAnnouncementDialog({
  open,
  onOpenChange,
  selectedOrganizationIds,
  onSuccess,
}: SendAnnouncementDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ successful: number; failed: number } | null>(null);

  const handleSend = async () => {
    if (!subject || !message) {
      alert('Ämne och meddelande är obligatoriska');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/super-admin/email/send-announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationIds: selectedOrganizationIds,
          subject,
          message,
          ctaText: ctaText || undefined,
          ctaUrl: ctaUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Misslyckades att skicka meddelande');
      }

      setResult({ successful: data.successful, failed: data.failed });

      // Reset form
      setSubject('');
      setMessage('');
      setCtaText('');
      setCtaUrl('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
      alert(error instanceof Error ? error.message : 'Misslyckades att skicka meddelande');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setResult(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Skicka meddelande</DialogTitle>
          <DialogDescription>
            Skicka ett e-postmeddelande till {selectedOrganizationIds.length} valda{' '}
            {selectedOrganizationIds.length === 1 ? 'organisation' : 'organisationer'}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  {result.successful} meddelanden skickade
                </p>
                {result.failed > 0 && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {result.failed} misslyckades
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Ämne *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="t.ex. Viktig uppdatering om EP Tracker"
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Meddelande *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Skriv ditt meddelande här..."
                rows={6}
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ctaText">Knapptext (valfritt)</Label>
              <Input
                id="ctaText"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="t.ex. Läs mer, Gå till dashboard"
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ctaUrl">Knapp-URL (valfritt)</Label>
              <Input
                id="ctaUrl"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://eptracker.se/..."
                disabled={sending}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>Stäng</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Avbryt
              </Button>
              <Button onClick={handleSend} disabled={sending || !subject || !message}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Skicka meddelande
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

