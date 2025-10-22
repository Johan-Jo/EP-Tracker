"use client";
import { useState } from 'react';
import { Plus, Search, Package, Receipt, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddMaterialDialog } from './AddMaterialDialog';

export function MaterialPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const materials = [
    {
      id: 1,
      name: 'Köksskåp - Vit högglans 60cm',
      project: 'Kök Renovering - Storgatan 12',
      category: 'Material',
      quantity: 8,
      unit: 'st',
      unitPrice: 2500,
      totalPrice: 20000,
      date: '2025-10-21',
      supplier: 'IKEA',
      status: 'purchased'
    },
    {
      id: 2,
      name: 'Kakel - Grå matt 30x60cm',
      project: 'Badrumsrenovering Villa',
      category: 'Material',
      quantity: 45,
      unit: 'm²',
      unitPrice: 450,
      totalPrice: 20250,
      date: '2025-10-20',
      supplier: 'Byggmax',
      status: 'ordered'
    },
    {
      id: 3,
      name: 'Bensinkostnad - Transport',
      project: 'Nybygge Altan',
      category: 'Utgift',
      quantity: 1,
      unit: 'st',
      unitPrice: 850,
      totalPrice: 850,
      date: '2025-10-19',
      supplier: 'Circle K',
      status: 'approved'
    },
    {
      id: 4,
      name: 'Tryckimpregnerat virke 45x95mm',
      project: 'Nybygge Altan',
      category: 'Material',
      quantity: 24,
      unit: 'st',
      unitPrice: 125,
      totalPrice: 3000,
      date: '2025-10-18',
      supplier: 'Beijer Byggmaterial',
      status: 'delivered'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'purchased':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'ordered':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'approved':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'purchased':
        return 'Köpt';
      case 'ordered':
        return 'Beställd';
      case 'approved':
        return 'Godkänd';
      case 'delivered':
        return 'Levererad';
      default:
        return status;
    }
  };

  const getCategoryIcon = (category: string) => {
    return category === 'Material' ? Package : Receipt;
  };

  const totalMaterialCost = materials
    .filter(m => m.category === 'Material')
    .reduce((sum, m) => sum + m.totalPrice, 0);

  const totalExpenses = materials
    .filter(m => m.category === 'Utgift')
    .reduce((sum, m) => sum + m.totalPrice, 0);

  return (
    <div className="flex-1 overflow-auto pb-20 md:pb-0">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="mb-1">Material & Utgifter</h1>
              <p className="text-sm text-muted-foreground">
                Hantera material och projektutgifter
              </p>
            </div>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Lägg till</span>
              <span className="md:hidden">Nytt</span>
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Sök material eller utgift..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="shrink-0">
              Filter
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-8 py-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Material</p>
                <p className="text-xl">{totalMaterialCost.toLocaleString('sv-SE')} kr</p>
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Utgifter</p>
                <p className="text-xl">{totalExpenses.toLocaleString('sv-SE')} kr</p>
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totalt</p>
                <p className="text-xl">{(totalMaterialCost + totalExpenses).toLocaleString('sv-SE')} kr</p>
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Denna månad</p>
                <p className="text-xl">44,100 kr</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4">Senaste material & utgifter</h3>
          <div className="space-y-3">
            {materials.map((material) => {
              const Icon = getCategoryIcon(material.category);
              
              return (
                <div
                  key={material.id}
                  className="bg-card border-2 border-border rounded-xl p-4 md:p-5 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01] transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          material.category === 'Material' ? 'bg-accent' : 'bg-blue-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            material.category === 'Material' ? 'text-primary' : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="mb-1 truncate">{material.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{material.project}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <span className="text-muted-foreground">
                              {material.quantity} {material.unit}
                            </span>
                            <span className="text-muted-foreground">
                              {material.unitPrice.toLocaleString('sv-SE')} kr/st
                            </span>
                            <span className="text-muted-foreground">
                              {material.supplier}
                            </span>
                            <span className="text-muted-foreground">
                              {material.date}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Totalt</p>
                        <p className="text-xl">{material.totalPrice.toLocaleString('sv-SE')} kr</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs border-2 whitespace-nowrap ${getStatusColor(material.status)}`}>
                          {getStatusText(material.status)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all duration-200"
                        >
                          Redigera
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <AddMaterialDialog 
        open={showAddDialog} 
        onClose={() => setShowAddDialog(false)} 
      />
    </div>
  );
}

