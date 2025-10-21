'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Clock, 
    Package, 
    FileText, 
    CheckSquare, 
    BookOpen, 
    AlertCircle,
    PlayCircle,
    Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TourLauncher } from '@/components/onboarding/tour-launcher';

type HelpPageClientProps = {
    userRole: 'admin' | 'foreman' | 'worker' | 'finance';
};

export function HelpPageClient({ userRole }: HelpPageClientProps) {
    const [activeTab, setActiveTab] = useState('guides');

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
                <TabsTrigger value="tours">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Interaktiva guider
                </TabsTrigger>
                <TabsTrigger value="guides">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Guider
                </TabsTrigger>
                <TabsTrigger value="faq">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Vanliga Frågor
                </TabsTrigger>
                <TabsTrigger value="videos">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Videotutorials
                </TabsTrigger>
            </TabsList>

            <TabsContent value="tours" className="space-y-4">
                <TourLauncher />
            </TabsContent>

            <TabsContent value="guides" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <Clock className="w-8 h-8 text-primary mb-2" />
                            <CardTitle>Tidrapportering</CardTitle>
                            <CardDescription>Lär dig att registrera arbetstid</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-sm space-y-2">
                                <h4 className="font-medium">Starta timer:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                    <li>Klicka på &quot;Starta timer&quot; i widgeten</li>
                                    <li>Välj projekt och uppgift</li>
                                    <li>Timern börjar räkna</li>
                                    <li>Klicka &quot;Stoppa&quot; när du är klar</li>
                                </ol>
                            </div>
                            <div className="text-sm space-y-2">
                                <h4 className="font-medium">Manuell registrering:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                    <li>Gå till &quot;Tid&quot;-sidan</li>
                                    <li>Klicka &quot;Lägg till tid&quot;</li>
                                    <li>Fyll i datum, start, stopp</li>
                                    <li>Välj projekt och fas</li>
                                    <li>Spara</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <Package className="w-8 h-8 text-primary mb-2" />
                            <CardTitle>Material & Utlägg</CardTitle>
                            <CardDescription>Registrera material och kostnader</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-sm space-y-2">
                                <h4 className="font-medium">Material:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                    <li>Gå till &quot;Material&quot;-sidan</li>
                                    <li>Klicka &quot;Lägg till material&quot;</li>
                                    <li>Beskriv vad du beställt</li>
                                    <li>Ange antal och à-pris</li>
                                    <li>Ta foto på kvitto (valfritt)</li>
                                    <li>Spara</li>
                                </ol>
                            </div>
                            <div className="text-sm space-y-2">
                                <h4 className="font-medium">Utlägg:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                    <li>Välj &quot;Utlägg&quot;-fliken</li>
                                    <li>Klicka &quot;Lägg till utlägg&quot;</li>
                                    <li>Välj kategori (parkering, verktyg, etc.)</li>
                                    <li>Ange belopp</li>
                                    <li>Ta foto på kvitto</li>
                                    <li>Spara</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>

                    {(userRole === 'admin' || userRole === 'foreman') && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CheckSquare className="w-8 h-8 text-primary mb-2" />
                                    <CardTitle>Godkännanden</CardTitle>
                                    <CardDescription>Granska och godkänn tidrapporter</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm space-y-2">
                                        <h4 className="font-medium">Godkänn tidrapporter:</h4>
                                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                    <li>Gå till &quot;Godkännanden&quot;</li>
                                    <li>Välj vecka att granska</li>
                                    <li>Granska tidrapporter i tabellen</li>
                                    <li>Markera de du vill godkänna</li>
                                    <li>Klicka &quot;Godkänn&quot;</li>
                                        </ol>
                                    </div>
                                    <div className="text-sm space-y-2">
                                        <h4 className="font-medium">Begär ändringar:</h4>
                                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                            <li>Klicka meddelande-ikonen på tidrapport</li>
                                            <li>Skriv vad som behöver ändras</li>
                                            <li>Skicka feedback</li>
                                            <li>Användaren ser din kommentar</li>
                                        </ol>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <FileText className="w-8 h-8 text-primary mb-2" />
                                    <CardTitle>CSV-Export</CardTitle>
                                    <CardDescription>Exportera data för lön och fakturering</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm space-y-2">
                                        <h4 className="font-medium">Löne-CSV:</h4>
                                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                            <li>Godkänn alla tidrapporter först</li>
                                            <li>Välj period (vecka)</li>
                                    <li>Klicka &quot;Löne-CSV&quot;</li>
                                    <li>Filen laddas ner</li>
                                    <li>Importera i lönesystem</li>
                                        </ol>
                                    </div>
                                    <div className="text-sm space-y-2">
                                        <h4 className="font-medium">Faktura-CSV:</h4>
                                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                            <li>Godkänn tid, material, ÄTA</li>
                                            <li>Välj period</li>
                                            <li>Klicka &quot;Faktura-CSV&quot;</li>
                                            <li>Granska CSV-fil</li>
                                            <li>Använd för fakturering</li>
                                        </ol>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    <Card>
                        <CardHeader>
                            <AlertCircle className="w-8 h-8 text-primary mb-2" />
                            <CardTitle>Offline-läge</CardTitle>
                            <CardDescription>Arbeta utan internetanslutning</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-sm space-y-2">
                                <p className="text-muted-foreground">
                                    EP Tracker fungerar offline! Allt du gör sparas lokalt och synkroniseras automatiskt när du får tillbaka internetanslutning.
                                </p>
                                <h4 className="font-medium">Offline-funktioner:</h4>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    <li>Registrera tid</li>
                                    <li>Lägg till material och utlägg</li>
                                    <li>Skapa ÄTA</li>
                                    <li>Fyll i dagbok</li>
                                    <li>Allt synkas när du är online igen</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="faq" className="space-y-4">
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Hur rättar jag en tidrapport?</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            <p>Du kan redigera tidrapporter som har status &quot;Utkast&quot;. Om en tidrapport redan är godkänd, kontakta din arbetsledare för att begära ändringar.</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Vad händer om jag glömmer stoppa timern?</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            <p>Timern fortsätter räkna tills du stoppar den manuellt. Du kan redigera start- och stopptid efteråt om du behöver korrigera tiden.</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Kan jag ta bort en tidrapport?</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            <p>Ja, tidrapporter med status &quot;Utkast&quot; kan tas bort. Godkända tidrapporter kan inte tas bort av säkerhetsskäl.</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Hur fungerar offline-läge?</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            <p>När du är offline sparas all data lokalt på din enhet. När du får internetanslutning igen synkroniseras automatiskt alla dina ändringar till servern. Du ser en synkroniseringsstatus längst upp i appen.</p>
                        </CardContent>
                    </Card>

                    {(userRole === 'admin' || userRole === 'foreman') && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Hur godkänner jag flera tidrapporter samtidigt?</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>Gå till &quot;Godkännanden&quot;, markera checkboxen på de tidrapporter du vill godkänna, och klicka sedan på &quot;Godkänn&quot;-knappen. Du kan också godkänna alla tidrapporter för en användare eller ett projekt på en gång.</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Var hittar jag tidigare exporter?</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>Klicka på &quot;Historik&quot;-knappen på godkännandesidan. Där ser du alla tidigare CSV-exporter med information om period, antal poster och vem som skapade exporten.</p>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="videos" className="space-y-4">
                <Card>
                    <CardContent className="py-12 text-center">
                        <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Videotutorials kommer snart</h3>
                        <p className="text-muted-foreground mb-6">
                            Vi arbetar på att skapa videotutorials för alla funktioner i EP Tracker.
                        </p>
                        <Button variant="outline">Prenumerera på uppdateringar</Button>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

