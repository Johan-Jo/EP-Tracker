"use client";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, Receipt } from 'lucide-react';

interface AddMaterialDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddMaterialDialog({ open, onClose }: AddMaterialDialogProps) {
  const [type, setType] = useState<'material' | 'expense'>('material');
  const [project, setProject] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('st');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  const projects = [
    { id: '1', name: 'Kök Renovering - Storgatan 12' },
    { id: '2', name: 'Badrumsrenovering Villa' },
    { id: '3', name: 'Nybygge Altan' }
  ];

  const units = [
    { value: 'st', label: 'st' },
    { value: 'm²', label: 'm²' },
    { value: 'm', label: 'm' },
    { value: 'kg', label: 'kg' },
    { value: 'l', label: 'l' },
    { value: 'förp', label: 'förp' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project || !name || !quantity || !unitPrice) {
      alert('Vänligen fyll i alla obligatoriska fält');
      return;
    }

    const totalPrice = parseFloat(quantity) * parseFloat(unitPrice);
    alert(
      `${type === 'material' ? 'Material' : 'Utgift'} tillagt!\n` +
      `Projekt: ${project}\nNamn: ${name}\nAntal: ${quantity} ${unit}\nÀ-pris: ${unitPrice} kr\n` +
      `Totalt: ${totalPrice.toLocaleString('sv-SE')} kr`
    );
    
    setProject('');
    setName('');
    setQuantity('');
    setUnitPrice('');
    setSupplier('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lägg till {type === 'material' ? 'Material' : 'Utgift'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('material')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                type === 'material'
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                  : 'bg-card border-border hover:border-primary/30 hover:bg-accent'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Package className="w-5 h-5" />
                <span>Material</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                type === 'expense'
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                  : 'bg-card border-border hover:border-primary/30 hover:bg-accent'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Receipt className="w-5 h-5" />
                <span>Utgift</span>
              </div>
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Projekt *</Label>
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger id="project" className="h-11">
                <SelectValue placeholder="Välj projekt" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.name}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{type === 'material' ? 'Materialnamn' : 'Utgiftsbeskrivning'} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'material' ? 'T.ex. Köksskåp - Vit högglans 60cm' : 'T.ex. Bensinkostnad - Transport'}
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Antal *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Enhet</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitPrice">À-pris (kr) *</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
              className="h-11"
            />
          </div>

          {quantity && unitPrice && (
            <div className="bg-accent rounded-xl p-4 border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Totalpris</span>
                <span className="text-xl text-primary">
                  {(parseFloat(quantity) * parseFloat(unitPrice)).toLocaleString('sv-SE')} kr
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="supplier">Leverantör/Betalare</Label>
            <Input
              id="supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="T.ex. IKEA, Byggmax, Circle K"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Valfria anteckningar..."
              className="resize-none h-20"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              className="flex-1 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
            >
              Lägg till
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

