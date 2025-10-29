"use client";
import { useState } from 'react';
import { Calendar, Clock, Save, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TimePage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');

  const projects = [
    { id: '1', name: 'Kök Renovering - Storgatan 12' },
    { id: '2', name: 'Badrumsrenovering Villa' },
    { id: '3', name: 'Nybygge Altan' }
  ];

  const recentEntries = [
    {
      id: 1,
      project: 'Kök Renovering - Storgatan 12',
      task: 'Installation av köksskåp',
      date: '2025-10-21',
      startTime: '08:00',
      endTime: '12:30',
      duration: '4h 30min',
      status: 'approved'
    },
    {
      id: 2,
      project: 'Badrumsrenovering Villa',
      task: 'Planlering och mätning',
      date: '2025-10-20',
      startTime: '13:00',
      endTime: '15:15',
      duration: '2h 15min',
      status: 'pending'
    },
    {
      id: 3,
      project: 'Nybygge Altan',
      task: 'Montering av bjälkar',
      date: '2025-10-20',
      startTime: '08:00',
      endTime: '14:00',
      duration: '6h 00min',
      status: 'approved'
    },
    {
      id: 4,
      project: 'Kök Renovering - Storgatan 12',
      task: 'Målning av väggar',
      date: '2025-10-19',
      startTime: '09:00',
      endTime: '16:00',
      duration: '7h 00min',
      status: 'approved'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Godkänd';
      case 'pending':
        return 'Väntar';
      case 'rejected':
        return 'Avvisad';
      default:
        return status;
    }
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return '';
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}min`;
  };

  const handleSave = () => {
    if (!selectedProject || !startTime || !endTime) {
      alert('Vänligen fyll i alla obligatoriska fält');
      return;
    }
    alert(`Tid sparad!\nProjekt: ${selectedProject}\nDatum: ${selectedDate}\nTid: ${calculateDuration()}\nBeskrivning: ${description || 'Ingen'}`);
    setDescription('');
    setEndTime('');
  };

  return (
    <div className="flex-1 overflow-auto pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 md:px-8 py-4 md:py-6">
          <div>
            <h1 className="mb-1">Manuell tidsregistrering</h1>
            <p className="text-sm text-muted-foreground">
              Registrera tid som redan har arbetats
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
        {/* Manual Entry Form */}
        <div className="bg-card border-2 border-border rounded-xl p-6 mb-6 shadow-lg">
          <h3 className="mb-6">Lägg till arbetstid</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Projekt *</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Välj projekt" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm mb-2">Datum *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none hidden md:block" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="md:pl-9 h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Starttid *</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Sluttid *</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {startTime && endTime && (
              <div className="bg-accent/50 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Total tid</p>
                <p className="text-xl text-primary">{calculateDuration()}</p>
              </div>
            )}

            <div>
              <label className="block text-sm mb-2">Beskrivning</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Vad arbetade du med? (valfritt)"
                className="resize-none h-24"
              />
            </div>

            <Button
              onClick={handleSave}
              className="w-full h-12 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200"
            >
              <Save className="w-4 h-4 mr-2" />
              Spara tidsrapport
            </Button>
          </div>
        </div>

        {/* Week Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <p className="text-sm text-muted-foreground mb-1">Idag</p>
            <p className="text-2xl">4h 30min</p>
          </div>
          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <p className="text-sm text-muted-foreground mb-1">Igår</p>
            <p className="text-2xl">8h 15min</p>
          </div>
          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <p className="text-sm text-muted-foreground mb-1">Denna vecka</p>
            <p className="text-2xl">32h 15min</p>
          </div>
          <div className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <p className="text-sm text-muted-foreground mb-1">Denna månad</p>
            <p className="text-2xl">128h 45min</p>
          </div>
        </div>

        {/* Recent Entries */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3>Senaste registreringar</h3>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-accent shrink-0">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="truncate mb-1">{entry.project}</h4>
                        <p className="text-sm text-muted-foreground">{entry.task}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-11">
                      <span>{entry.date}</span>
                      <span>{entry.startTime} - {entry.endTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-11 md:ml-0">
                    <div className="text-right">
                      <p className="text-xl">{entry.duration}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs border-2 whitespace-nowrap ${getStatusColor(entry.status)}`}>
                      {getStatusText(entry.status)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all duration-200"
                    >
                      Ändra
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

