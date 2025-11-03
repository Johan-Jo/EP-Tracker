"use client";

import { useState } from 'react';
import { z } from 'zod';

type Props = {
  projectId: string;
  sessionId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated?: () => void;
};

const schema = z.object({
  field: z.enum(['check_in_ts', 'check_out_ts']),
  new_value: z.string(),
  reason: z.string().min(10),
});

export function CorrectionDialog({ projectId, sessionId, open, onOpenChange, onUpdated }: Props) {
  const [field, setField] = useState<'check_in_ts' | 'check_out_ts'>('check_in_ts');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const parsed = schema.safeParse({ field, new_value: newValue, reason });
    if (!parsed.success) {
      setError('Fyll i alla fält (minst 10 tecken för orsak).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/worksites/${projectId}/sessions/${sessionId}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, new_value: newValue, reason }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Kunde inte spara korrigeringen');
      }
      onOpenChange(false);
      onUpdated?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow-xl">
        <h3 className="text-lg font-semibold">Korrigera pass</h3>
        <p className="mt-1 text-sm text-gray-600">Alla rättelser loggas och kan granskas.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Fält</label>
            <select className="mt-1 w-full rounded border p-2" value={field} onChange={e => setField(e.target.value as any)}>
              <option value="check_in_ts">In-tid</option>
              <option value="check_out_ts">Ut-tid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Ny tid</label>
            <input type="datetime-local" className="mt-1 w-full rounded border p-2" value={newValue} onChange={e => setNewValue(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Orsak</label>
            <textarea className="mt-1 w-full rounded border p-2" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Beskriv varför korrigeringen behövs" />
          </div>
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="rounded border px-3 py-2" onClick={() => onOpenChange(false)} disabled={submitting}>Avbryt</button>
          <button className="rounded bg-primary px-3 py-2 text-white disabled:opacity-60" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Sparar…' : 'Spara korrigering'}</button>
        </div>
      </div>
    </div>
  );
}


