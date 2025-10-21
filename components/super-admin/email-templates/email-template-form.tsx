'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface EmailTemplateFormProps {
  template: any;
}

export function EmailTemplateForm({ template }: EmailTemplateFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    subject_template: template.subject_template || '',
    body_template: template.body_template || '',
    description: template.description || '',
    is_active: template.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const response = await fetch(`/api/super-admin/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Misslyckades att uppdatera mall');
      }

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      console.error('Error updating template:', error);
      alert(error instanceof Error ? error.message : 'Misslyckades att uppdatera mall');
    } finally {
      setSaving(false);
    }
  };

  const isSystemTemplate = template.is_system;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Redigera mall
      </h2>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Subject Template */}
        <div className="space-y-2">
          <Label htmlFor="subject_template">
            Ämnesrad *
            {isSystemTemplate && (
              <span className="ml-2 text-xs text-gray-500">(Kan ej ändras för systemmallar)</span>
            )}
          </Label>
          <Input
            id="subject_template"
            value={formData.subject_template}
            onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
            placeholder="t.ex. Din provperiod slutar om {{daysRemaining}} dagar"
            disabled={isSystemTemplate || saving}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Använd {'{{'} och {'}}'}  för att lägga till variabler (se lista till höger)
          </p>
        </div>

        {/* Body Template */}
        <div className="space-y-2">
          <Label htmlFor="body_template">
            E-postinnehåll / Brödtext
            {isSystemTemplate && (
              <span className="ml-2 text-xs text-gray-500">(Systemmallar har fast design)</span>
            )}
          </Label>
          <Textarea
            id="body_template"
            value={formData.body_template}
            onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
            placeholder="Skriv e-postens brödtext här. Använd {{variabler}} för dynamiskt innehåll."
            rows={12}
            disabled={saving}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Använd Markdown-formatering: **fet**, *kursiv*, [länk](url)
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Beskrivning</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Beskriv när denna mall används..."
            rows={3}
            disabled={saving}
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            disabled={saving}
            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <Label htmlFor="is_active" className="cursor-pointer">
            Mall är aktiv
          </Label>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sparar...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Sparat!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Spara ändringar
              </>
            )}
          </Button>

          {success && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Mallen har uppdaterats
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

