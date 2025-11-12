'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Users, FileText, Download, Clock, Shield } from 'lucide-react';
import { TimeEntriesReviewTable } from './time-entries-review-table';
import { MaterialsReviewTable } from './materials-review-table';
import { WeekSelector } from './week-selector';
import { PeriodLocksManager } from './period-locks-manager';
import { ExportPreviewDialog } from './export-preview-dialog';
import Link from 'next/link';

type ApprovalsPageClientProps = {
    orgId: string;
    userRole: 'admin' | 'foreman' | 'worker' | 'finance' | 'ue';
};

export function ApprovalsPageClient({ orgId, userRole }: ApprovalsPageClientProps) {
    const [selectedWeek, setSelectedWeek] = useState(() => {
        // Get current week start (Monday)
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    });

    const weekEnd = new Date(selectedWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return (
        <div className="space-y-6">
            {/* Week Selector */}
            <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-orange-600 dark:text-orange-500" />
                            <div>
                                <CardTitle className="text-gray-900 dark:text-white">Välj period</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Granska och godkänn tidrapporter och kostnader
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href="/dashboard/approvals/history">
                                <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-700">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Historik
                                </Button>
                            </Link>
                            {userRole === 'admin' && (
                                <Link href="/dashboard/approvals/audit-logs">
                                    <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-700">
                                        <Shield className="w-4 h-4 mr-2" />
                                        Granskningsloggar
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent data-tour="week-selector">
                    <WeekSelector
                        selectedWeek={selectedWeek}
                        onWeekChange={setSelectedWeek}
                    />
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                            Väntande tidrapporter
                        </CardTitle>
                        <Clock className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">-</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            För vald period
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                            Väntande kostnader
                        </CardTitle>
                        <FileText className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">-</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Material, utlägg, miltal
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                            Unika användare
                        </CardTitle>
                        <Users className="h-5 w-5 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">-</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Med pendande poster
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Review Tables */}
            <Tabs defaultValue="time" className="space-y-4">
                <TabsList data-tour="approvals-tabs">
                    <TabsTrigger value="time">
                        <Clock className="w-4 h-4 mr-2" />
                        Tidrapporter
                    </TabsTrigger>
                    <TabsTrigger value="materials">
                        <FileText className="w-4 h-4 mr-2" />
                        Kostnader
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="time" className="space-y-4">
                    <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <CardHeader>
                            <CardTitle className="text-gray-900 dark:text-white">Tidrapporter att granska</CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                Granska och godkänn tidrapporter för perioden {selectedWeek.toLocaleDateString('sv-SE')} - {weekEnd.toLocaleDateString('sv-SE')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TimeEntriesReviewTable
                                orgId={orgId}
                                periodStart={selectedWeek}
                                periodEnd={weekEnd}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4">
                    <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <CardHeader>
                            <CardTitle className="text-gray-900 dark:text-white">Kostnader att granska</CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                Granska och godkänn material, utlägg och miltal för perioden {selectedWeek.toLocaleDateString('sv-SE')} - {weekEnd.toLocaleDateString('sv-SE')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MaterialsReviewTable
                                orgId={orgId}
                                periodStart={selectedWeek}
                                periodEnd={weekEnd}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Export Actions */}
            <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Exportera data</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                        Generera CSV-filer för lön och fakturering
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3" data-tour="export-buttons">
                        <ExportPreviewDialog
                            exportType="salary"
                            periodStart={selectedWeek}
                            periodEnd={weekEnd}
                        >
                            <Button variant="outline" className="border-gray-300 dark:border-gray-700">
                                <Download className="w-4 h-4 mr-2" />
                                Löne-CSV
                            </Button>
                        </ExportPreviewDialog>

                        <ExportPreviewDialog
                            exportType="invoice"
                            periodStart={selectedWeek}
                            periodEnd={weekEnd}
                        >
                            <Button variant="outline" className="border-gray-300 dark:border-gray-700">
                                <Download className="w-4 h-4 mr-2" />
                                Faktura-CSV
                            </Button>
                        </ExportPreviewDialog>

                        <Link href={`/api/exports/attachments?start=${selectedWeek.toISOString().split('T')[0]}&end=${weekEnd.toISOString().split('T')[0]}`}>
                            <Button variant="outline" className="border-gray-300 dark:border-gray-700">
                                <Download className="w-4 h-4 mr-2" />
                                Bilagor (.zip)
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Period Locks */}
            <PeriodLocksManager orgId={orgId} userRole={userRole} />
        </div>
    );
}

