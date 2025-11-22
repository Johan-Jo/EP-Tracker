/**
 * Temporary test page for reminder notifications
 * Allows manual testing of check-in and check-out reminder emails
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { Loader2, Send, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  projectNumber?: string;
  displayName: string;
}

export default function TestRemindersPage() {
  // Load saved work time settings from localStorage
  // Use consistent default values to avoid hydration mismatch
  const [workDayStart, setWorkDayStartState] = useState<string>('07:00');
  const [workDayEnd, setWorkDayEndState] = useState<string>('16:00');
  const [isClient, setIsClient] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    setIsClient(true);
    const savedStart = localStorage.getItem('test-reminders-workDayStart');
    const savedEnd = localStorage.getItem('test-reminders-workDayEnd');
    if (savedStart) {
      setWorkDayStartState(savedStart);
    }
    if (savedEnd) {
      setWorkDayEndState(savedEnd);
    }
  }, []);

  // Wrapper functions to save to localStorage when values change
  const setWorkDayStart = (value: string) => {
    setWorkDayStartState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('test-reminders-workDayStart', value);
    }
  };

  const setWorkDayEnd = (value: string) => {
    setWorkDayEndState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('test-reminders-workDayEnd', value);
    }
  };

  const [userId, setUserId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [checkoutReminderMinutesBefore, setCheckoutReminderMinutesBefore] = useState<number>(15);
  const [forgottenCheckoutMinutesAfter, setForgottenCheckoutMinutesAfter] = useState<number>(30);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [checkInResult, setCheckInResult] = useState<TestResult | null>(null);
  const [checkOutResult, setCheckOutResult] = useState<TestResult | null>(null);
  const [cronCheckInResult, setCronCheckInResult] = useState<TestResult | null>(null);
  const [forgottenCheckoutResult, setForgottenCheckoutResult] = useState<TestResult | null>(null);
  const [isLoadingCheckIn, setIsLoadingCheckIn] = useState(false);
  const [isLoadingCheckOut, setIsLoadingCheckOut] = useState(false);
  const [isLoadingCronCheckIn, setIsLoadingCronCheckIn] = useState(false);
  const [isLoadingForgottenCheckout, setIsLoadingForgottenCheckout] = useState(false);
  const [checkedInSince, setCheckedInSince] = useState<string>('');
  const [debugResult, setDebugResult] = useState<any>(null);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['test-reminders-users'],
    queryFn: async () => {
      const response = await fetch('/api/test/reminders/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      return (data.users || []) as User[];
    },
  });

  // Fetch projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['test-reminders-projects'],
    queryFn: async () => {
      const response = await fetch('/api/test/reminders/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      return (data.projects || []) as Project[];
    },
  });

  // Fetch project settings when project is selected
  useEffect(() => {
    if (projectId && isClient) {
      fetch(`/api/test/reminders/project-settings?projectId=${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.workDayStart) {
            setWorkDayStart(data.workDayStart);
          }
          if (data.workDayEnd) {
            setWorkDayEnd(data.workDayEnd);
          }
          if (data.checkoutReminderMinutesBefore !== undefined) {
            setCheckoutReminderMinutesBefore(data.checkoutReminderMinutesBefore);
          }
          if (data.forgottenCheckoutMinutesAfter !== undefined) {
            setForgottenCheckoutMinutesAfter(data.forgottenCheckoutMinutesAfter);
          }
        })
        .catch((error) => {
          console.error('Error fetching project settings:', error);
          // Use defaults if fetch fails
        });
    }
  }, [projectId, isClient]);

  // Save project settings
  const handleSaveSettings = async () => {
    if (!projectId) {
      toast.error('Välj ett projekt först');
      return;
    }

    setIsSavingSettings(true);
    setSettingsSaved(false);

    try {
      const response = await fetch('/api/test/reminders/project-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          workDayStart,
          workDayEnd,
          checkoutReminderMinutesBefore,
          forgottenCheckoutMinutesAfter,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSettingsSaved(true);
        toast.success('Projektinställningar sparade!');
        setTimeout(() => setSettingsSaved(false), 3000);
      } else {
        toast.error(data.error || 'Kunde inte spara inställningar');
      }
    } catch (error: any) {
      toast.error('Kunde inte spara inställningar');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTestCheckIn = async () => {
    if (!userId || !projectId) {
      toast.error('Välj användare och projekt');
      return;
    }

    setIsLoadingCheckIn(true);
    setCheckInResult(null);

    try {
      const response = await fetch('/api/test/reminders/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          projectId,
          workDayStart,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCheckInResult({
          success: true,
          message: data.message || 'Check-in påminnelse skickad',
          details: data,
        });
        toast.success('Check-in påminnelse skickad!');
      } else {
        setCheckInResult({
          success: false,
          error: data.error || 'Okänt fel',
          details: data,
        });
        toast.error(data.error || 'Kunde inte skicka påminnelse');
      }
    } catch (error: any) {
      setCheckInResult({
        success: false,
        error: error.message || 'Nätverksfel',
      });
      toast.error('Kunde inte skicka påminnelse');
    } finally {
      setIsLoadingCheckIn(false);
    }
  };

  const handleTestCheckOut = async () => {
    if (!userId || !projectId) {
      toast.error('Välj användare och projekt');
      return;
    }

    setIsLoadingCheckOut(true);
    setCheckOutResult(null);

    try {
      const response = await fetch('/api/test/reminders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          projectId,
          workDayEnd,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCheckOutResult({
          success: true,
          message: data.message || 'Check-out påminnelse skickad',
          details: data,
        });
        toast.success('Check-out påminnelse skickad!');
      } else {
        setCheckOutResult({
          success: false,
          error: data.error || 'Okänt fel',
          details: data,
        });
        toast.error(data.error || 'Kunde inte skicka påminnelse');
      }
    } catch (error: any) {
      setCheckOutResult({
        success: false,
        error: error.message || 'Nätverksfel',
      });
      toast.error('Kunde inte skicka påminnelse');
    } finally {
      setIsLoadingCheckOut(false);
    }
  };

  const handleTestForgottenCheckout = async () => {
    if (!userId || !projectId) {
      toast.error('Välj användare och projekt');
      return;
    }

    setIsLoadingForgottenCheckout(true);
    setForgottenCheckoutResult(null);

    try {
      const response = await fetch('/api/test/reminders/forgotten-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          projectId,
          workDayEnd,
          checkedInSince: checkedInSince || new Date().toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setForgottenCheckoutResult({
        success: true,
        message: data.message || 'Varning skickad',
        details: data,
      });
      toast.success('Glömt utcheckningsvarning skickad!');
    } catch (error: any) {
      console.error('Error testing forgotten checkout:', error);
      setForgottenCheckoutResult({
        success: false,
        error: error.message || 'Okänt fel',
      });
      toast.error(error.message || 'Kunde inte skicka varning');
    } finally {
      setIsLoadingForgottenCheckout(false);
    }
  };

  const handleTestForgottenCheckoutForce = async () => {
    setIsLoadingForgottenCheckout(true);
    setForgottenCheckoutResult(null);

    try {
      console.log('[Test] Calling force endpoint (ignores time window)...');
      const response = await fetch('/api/test/reminders/forgotten-checkout-force', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setForgottenCheckoutResult({
        success: true,
        message: `Skickade ${data.sent} varningar (kontrollerade ${data.checked} projekt)`,
        details: data,
      });
      toast.success(`Skickade ${data.sent} varningar!`);
    } catch (error: any) {
      console.error('Error testing forgotten checkout force:', error);
      setForgottenCheckoutResult({
        success: false,
        error: error.message || 'Okänt fel',
        details: error,
      });
      toast.error(error.message || 'Kunde inte skicka varningar');
    } finally {
      setIsLoadingForgottenCheckout(false);
    }
  };

  const handleTestLogInsert = async () => {
    try {
      console.log('[Test] Testing notification_log INSERT...');
      const response = await fetch('/api/test/reminders/test-log-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('✅ INSERT fungerar! Notifikationer kan loggas.');
        console.log('[Test] INSERT test successful:', data);
      } else {
        toast.error(`❌ INSERT misslyckades: ${data.error || 'Okänt fel'}`);
        console.error('[Test] INSERT test failed:', data);
      }
    } catch (error: any) {
      toast.error(`❌ Fel vid test: ${error.message}`);
      console.error('[Test] INSERT test exception:', error);
    }
  };

  const handleTestPush = async () => {
    if (!userId) {
      toast.error('Välj en användare först');
      return;
    }

    try {
      console.log('[Test] Testing push notification...');
      const response = await fetch('/api/test/reminders/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(`✅ Test push skickad till ${data.successCount} enhet(er)!`);
        console.log('[Test] Push test successful:', data);
      } else {
        toast.error(`❌ Push test misslyckades: ${data.error || 'Okänt fel'}`);
        console.error('[Test] Push test failed:', data);
      }
    } catch (error: any) {
      toast.error(`❌ Fel vid test: ${error.message}`);
      console.error('[Test] Push test exception:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Testa Påminnelser
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Testa check-in och check-out påminnelser manuellt
        </p>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Inställningar</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Välj användare och projekt för att testa påminnelser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">Användare</Label>
            <Select value={userId} onValueChange={setUserId} disabled={usersLoading}>
              <SelectTrigger id="userId">
                <SelectValue placeholder="Välj användare" />
              </SelectTrigger>
              <SelectContent>
                {usersData && usersData.length > 0 ? (
                  usersData.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.email}</span>
                        {user.name !== user.email && (
                          <span className="text-xs text-gray-500">{user.name}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-users" disabled>
                    Inga användare hittades
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectId">Projekt</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={projectsLoading}>
              <SelectTrigger id="projectId">
                <SelectValue placeholder="Välj projekt" />
              </SelectTrigger>
              <SelectContent>
                {projectsData && projectsData.length > 0 ? (
                  projectsData.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.displayName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-projects" disabled>
                    Inga projekt hittades
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workDayStart">Arbetsdag start (HH:MM)</Label>
                <Input
                  id="workDayStart"
                  value={workDayStart}
                  onChange={(e) => setWorkDayStart(e.target.value)}
                  placeholder="07:00"
                  disabled={!projectId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workDayEnd">Arbetsdag slut (HH:MM)</Label>
                <Input
                  id="workDayEnd"
                  value={workDayEnd}
                  onChange={(e) => setWorkDayEnd(e.target.value)}
                  placeholder="16:00"
                  disabled={!projectId}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkoutReminderMinutesBefore">
                Check-out påminnelse (minuter innan sluttid)
              </Label>
              <Input
                id="checkoutReminderMinutesBefore"
                type="number"
                min="1"
                max="120"
                value={checkoutReminderMinutesBefore}
                onChange={(e) => setCheckoutReminderMinutesBefore(parseInt(e.target.value) || 15)}
                placeholder="15"
                disabled={!projectId}
                className="w-32"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Påminnelse skickas {checkoutReminderMinutesBefore} minuter innan {isClient ? workDayEnd : '--:--'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forgottenCheckoutMinutesAfter">
                Glömt utcheckningsvarning (minuter efter sluttid)
              </Label>
              <Input
                id="forgottenCheckoutMinutesAfter"
                type="number"
                min="1"
                max="120"
                value={forgottenCheckoutMinutesAfter}
                onChange={(e) => setForgottenCheckoutMinutesAfter(parseInt(e.target.value) || 30)}
                placeholder="30"
                disabled={!projectId}
                className="w-32"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Varning skickas till användaren som glömt checka ut {forgottenCheckoutMinutesAfter} minuter efter {isClient ? workDayEnd : '--:--'}
              </p>
            </div>

            {projectId && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings || !projectId}
                  variant="default"
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Spara projektinställningar
                    </>
                  )}
                </Button>
                {settingsSaved && (
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Sparat!
                  </span>
                )}
              </div>
            )}

            {!projectId && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Välj ett projekt för att se och ändra projektets worktime-inställningar
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkedInSince">Incheckad sedan (HH:MM) - för glömt utcheckning</Label>
            <Input
              id="checkedInSince"
              type="time"
              value={checkedInSince}
              onChange={(e) => setCheckedInSince(e.target.value)}
              placeholder="07:00"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Används endast för glömt utcheckningsvarning. Lämna tomt för aktuell tid.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Reminder Test */}
      <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Check-in Påminnelse</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Skicka påminnelse att checka in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleTestCheckIn}
            disabled={isLoadingCheckIn || !userId || !projectId}
            className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            {isLoadingCheckIn ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Skicka Check-in Påminnelse
              </>
            )}
          </Button>

          {checkInResult && (
            <div
              className={`p-4 rounded-lg border-2 ${
                checkInResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {checkInResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      checkInResult.success
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-red-900 dark:text-red-300'
                    }`}
                  >
                    {checkInResult.success ? checkInResult.message : 'Fel'}
                  </p>
                  {checkInResult.error && (
                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                      {checkInResult.error}
                    </p>
                  )}
                  {checkInResult.details && (
                    <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto">
                      {JSON.stringify(checkInResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-out Reminder Test */}
      <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Check-out Påminnelse</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Skicka påminnelse att checka ut
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleTestCheckOut}
            disabled={isLoadingCheckOut || !userId || !projectId}
            className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            {isLoadingCheckOut ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Skicka Check-out Påminnelse
              </>
            )}
          </Button>

          {checkOutResult && (
            <div
              className={`p-4 rounded-lg border-2 ${
                checkOutResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {checkOutResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      checkOutResult.success
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-red-900 dark:text-red-300'
                    }`}
                  >
                    {checkOutResult.success ? checkOutResult.message : 'Fel'}
                  </p>
                  {checkOutResult.error && (
                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                      {checkOutResult.error}
                    </p>
                  )}
                  {checkOutResult.details && (
                    <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto">
                      {JSON.stringify(checkOutResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cron Check-in Reminders Test */}
      <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Cron Check-in Påminnelser</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Testa cron-jobbet som skickar check-in påminnelser baserat på projekt-inställningar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={async () => {
              setIsLoadingCronCheckIn(true);
              setCronCheckInResult(null);

              try {
                const response = await fetch('/api/test/reminders/cron-checkin', {
                  method: 'POST',
                });

                const data = await response.json();

                if (response.ok) {
                  setCronCheckInResult({
                    success: true,
                    message: `Skickade ${data.sent} påminnelser från ${data.checked} projekt`,
                    details: data,
                  });
                  toast.success(`Skickade ${data.sent} påminnelser!`);
                } else {
                  setCronCheckInResult({
                    success: false,
                    error: data.error || 'Okänt fel',
                    details: data,
                  });
                  toast.error(data.error || 'Kunde inte skicka påminnelser');
                }
              } catch (error: any) {
                setCronCheckInResult({
                  success: false,
                  error: error.message || 'Nätverksfel',
                });
                toast.error('Kunde inte skicka påminnelser');
              } finally {
                setIsLoadingCronCheckIn(false);
              }
            }}
            disabled={isLoadingCronCheckIn}
            variant="outline"
            className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {isLoadingCronCheckIn ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Testa Cron Check-in Påminnelser
              </>
            )}
          </Button>

          {cronCheckInResult && (
            <div
              className={`p-4 rounded-lg border-2 ${
                cronCheckInResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {cronCheckInResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      cronCheckInResult.success
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-red-900 dark:text-red-300'
                    }`}
                  >
                    {cronCheckInResult.success ? cronCheckInResult.message : 'Fel'}
                  </p>
                  {cronCheckInResult.error && (
                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                      {cronCheckInResult.error}
                    </p>
                  )}
                  {cronCheckInResult.details && (
                    <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto">
                      {JSON.stringify(cronCheckInResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cron Check-out Reminders Test */}
      <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Cron Check-out Påminnelser</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Testa cron-jobbet som skickar check-out påminnelser till alla med aktiva time entries
          </CardDescription>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            <strong>Testa (Simulerad):</strong> Använder test-endpoint som simulerar cron-logiken<br />
            <strong>Kör Riktigt Cron Job:</strong> Anropar det faktiska cron-endpointet med CRON_SECRET (samma som GitHub Actions gör)
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                setIsLoadingCheckOut(true);
                setCheckOutResult(null);

                try {
                  const response = await fetch('/api/test/reminders/cron-checkout', {
                    method: 'POST',
                  });

                  const data = await response.json();

                  if (response.ok) {
                    setCheckOutResult({
                      success: true,
                      message: `Skickade ${data.sent} påminnelser till ${data.total} användare`,
                      details: data,
                    });
                    toast.success(`Skickade ${data.sent} påminnelser!`);
                  } else {
                    setCheckOutResult({
                      success: false,
                      error: data.error || 'Okänt fel',
                      details: data,
                    });
                    toast.error(data.error || 'Kunde inte skicka påminnelser');
                  }
                } catch (error: any) {
                  setCheckOutResult({
                    success: false,
                    error: error.message || 'Nätverksfel',
                  });
                  toast.error('Kunde inte skicka påminnelser');
                } finally {
                  setIsLoadingCheckOut(false);
                }
              }}
              disabled={isLoadingCheckOut}
              variant="outline"
              className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              {isLoadingCheckOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Skickar...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Testa (Simulerad)
                </>
              )}
            </Button>

            <Button
              onClick={async () => {
                setIsLoadingCheckOut(true);
                setCheckOutResult(null);

                try {
                  const response = await fetch('/api/test/reminders/cron-checkout-real', {
                    method: 'POST',
                  });

                  const data = await response.json();

                  if (response.ok) {
                    setCheckOutResult({
                      success: true,
                      message: `✅ Riktigt cron job kördes! Skickade ${data.sent || 0} påminnelser till ${data.total || 0} användare`,
                      details: data,
                    });
                    toast.success(`Riktigt cron job kördes! Skickade ${data.sent || 0} påminnelser`);
                  } else {
                    setCheckOutResult({
                      success: false,
                      error: data.error || 'Okänt fel',
                      details: data,
                    });
                    toast.error(data.error || 'Kunde inte köra cron job');
                  }
                } catch (error: any) {
                  setCheckOutResult({
                    success: false,
                    error: error.message || 'Nätverksfel',
                  });
                  toast.error('Kunde inte köra cron job');
                } finally {
                  setIsLoadingCheckOut(false);
                }
              }}
              disabled={isLoadingCheckOut}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
            >
              {isLoadingCheckOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kör riktigt cron job...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Kör Riktigt Cron Job
                </>
              )}
            </Button>
          </div>

          {checkOutResult && checkOutResult.details && (
            <div
              className={`p-4 rounded-lg border-2 ${
                checkOutResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {checkOutResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      checkOutResult.success
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-red-900 dark:text-red-300'
                    }`}
                  >
                    {checkOutResult.success ? checkOutResult.message : 'Fel'}
                  </p>
                  {checkOutResult.error && (
                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                      {checkOutResult.error}
                    </p>
                  )}
                  {checkOutResult.details && (
                    <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto">
                      {JSON.stringify(checkOutResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Notifications */}
      <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Debug Notifikationer</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Se varför notifikationer inte skickas - kontrollerar preferenser, subscriptions och delivery method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={async () => {
              if (!userId) {
                toast.error('Välj användare först');
                return;
              }

              setIsLoadingDebug(true);
              setDebugResult(null);

              try {
                const response = await fetch('/api/test/reminders/debug', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId }),
                });

                const data = await response.json();

                if (response.ok) {
                  setDebugResult(data);
                  toast.success('Debug-info hämtad');
                } else {
                  toast.error(data.error || 'Kunde inte hämta debug-info');
                }
              } catch (error: any) {
                toast.error('Kunde inte hämta debug-info');
              } finally {
                setIsLoadingDebug(false);
              }
            }}
            disabled={isLoadingDebug || !userId}
            variant="outline"
            className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          >
            {isLoadingDebug ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Laddar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Debug Notifikationer
              </>
            )}
          </Button>

          {debugResult && (
            <div className="p-4 rounded-lg border-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Debug Resultat</h4>
              <div className="space-y-3 text-sm">
                {debugResult.notificationDecision && (
                  <div>
                    <strong>Notifikationsbeslut:</strong>
                    <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded">
                      <p className={debugResult.notificationDecision.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {debugResult.notificationDecision.reason || 'Okänt'}
                      </p>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Enabled: {debugResult.notificationDecision.isEnabled ? 'Ja' : 'Nej'} {' | '}
                        Delivery: {debugResult.notificationDecision.deliveryMethod || 'N/A'} {' | '}
                        Push: {debugResult.notificationDecision.wouldSendPush ? 'Ja' : 'Nej'} {' | '}
                        Email: {debugResult.notificationDecision.wouldSendEmail ? 'Ja' : 'Nej'}
                      </p>
                    </div>
                  </div>
                )}

                {debugResult.preferences && (
                  <div>
                    <strong>Preferenser:</strong>
                    <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-auto">
                      {JSON.stringify(debugResult.preferences, null, 2)}
                    </pre>
                  </div>
                )}

                {debugResult.subscriptions && (
                  <div>
                    <strong>Push Subscriptions:</strong>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      Totalt: {debugResult.subscriptions.count || 0} {' | '}
                      Aktiva: {debugResult.subscriptions.active || 0}
                    </p>
                    {debugResult.subscriptions.subscriptions && debugResult.subscriptions.subscriptions.length > 0 && (
                      <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-auto">
                        {JSON.stringify(debugResult.subscriptions.subscriptions, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {debugResult.activeTimeEntries && (
                  <div>
                    <strong>Aktiva Time Entries:</strong>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      Antal: {debugResult.activeTimeEntries.count || 0}
                    </p>
                    {debugResult.activeTimeEntries.entries && debugResult.activeTimeEntries.entries.length > 0 && (
                      <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-auto">
                        {JSON.stringify(debugResult.activeTimeEntries.entries, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {debugResult.quietHours && (
                  <div>
                    <strong>Quiet Hours:</strong>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      I quiet hours: {debugResult.quietHours.inQuietHours ? 'Ja' : 'Nej'}
                    </p>
                  </div>
                )}

                <details className="mt-2">
                  <summary className="cursor-pointer font-medium text-blue-700 dark:text-blue-300">
                    Visa all debug-data
                  </summary>
                  <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(debugResult, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Notification Log INSERT */}
      <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Test Notification Log INSERT</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Testa om notification_log INSERT fungerar (krävs för att logga notifikationer)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={handleTestLogInsert}
            variant="outline"
            className="w-full"
          >
            Testa INSERT
          </Button>
          <Button
            onClick={handleTestPush}
            variant="outline"
            className="w-full"
            disabled={!userId}
          >
            Testa Push Notification
          </Button>
        </CardContent>
      </Card>

      {/* Forgotten Checkout Alert Test */}
      <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Glömt Utcheckningsvarning</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Testa varningen som skickas till arbetsledare när en arbetare glömt checka ut
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleTestForgottenCheckout}
              disabled={isLoadingForgottenCheckout || !userId || !projectId}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            >
              {isLoadingForgottenCheckout ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Skickar...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Skicka för vald användare
                </>
              )}
            </Button>
            <Button
              onClick={handleTestForgottenCheckoutForce}
              disabled={isLoadingForgottenCheckout}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-500 dark:hover:bg-red-900/20"
            >
              {isLoadingForgottenCheckout ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testar...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Testa ALLA aktiva (ignorerar tidsfönster)
                </>
              )}
            </Button>
            <Button
              onClick={async () => {
                setIsLoadingForgottenCheckout(true);
                setForgottenCheckoutResult(null);

                try {
                  const response = await fetch('/api/test/reminders/cron-forgotten-checkout-real', {
                    method: 'POST',
                  });

                  const data = await response.json();

                  if (response.ok) {
                    setForgottenCheckoutResult({
                      success: true,
                      message: `✅ Riktigt cron job kördes! Skickade ${data.sent || 0} varningar (kontrollerade ${data.checked || 0} projekt, hoppade över ${data.skippedTimeWindow || 0} pga tidsfönster, ${data.skippedNoActiveEntries || 0} pga inga aktiva entries)`,
                      details: data,
                    });
                    toast.success(`Riktigt cron job kördes! Skickade ${data.sent || 0} varningar`);
                  } else {
                    setForgottenCheckoutResult({
                      success: false,
                      error: data.error || 'Okänt fel',
                      details: data,
                    });
                    toast.error(data.error || 'Kunde inte köra cron job');
                  }
                } catch (error: any) {
                  setForgottenCheckoutResult({
                    success: false,
                    error: error.message || 'Nätverksfel',
                  });
                  toast.error('Kunde inte köra cron job');
                } finally {
                  setIsLoadingForgottenCheckout(false);
                }
              }}
              disabled={isLoadingForgottenCheckout}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
            >
              {isLoadingForgottenCheckout ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testar...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Testa Riktigt Cron Job
                </>
              )}
            </Button>
          </div>

          {forgottenCheckoutResult && (
            <div
              className={`p-4 rounded-lg border-2 ${
                forgottenCheckoutResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {forgottenCheckoutResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      forgottenCheckoutResult.success
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-red-900 dark:text-red-300'
                    }`}
                  >
                    {forgottenCheckoutResult.success ? forgottenCheckoutResult.message : 'Fel'}
                  </p>
                  {forgottenCheckoutResult.error && (
                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                      {forgottenCheckoutResult.error}
                    </p>
                  )}
                  {forgottenCheckoutResult.details && (
                    <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
                      {JSON.stringify(forgottenCheckoutResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              <strong>Hur det fungerar:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Välj en användare och ett projekt</li>
              <li>Varningen skickas till alla admins och arbetsledare i projektets organisation</li>
              <li>Varningen visar att användaren inte har checkat ut efter arbetsdagens slut</li>
              <li>Du kan ange "Incheckad sedan" för att simulera olika tider</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Denna sida är temporär och används för att testa påminnelser. Påminnelserna skickas via
            email och push (om aktiverat) baserat på användarens notifikationsinställningar.
          </p>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-3">
            <p>
              <strong>Check-in påminnelse:</strong> Skickas till en specifik användare för ett projekt baserat på projekt-inställningar (alert_settings).
            </p>
            <p>
              <strong>Check-out påminnelse:</strong> Skickas till en specifik användare för ett projekt.
            </p>
            <p>
              <strong>Cron check-in:</strong> Simulerar cron-jobbet som körs varje timme. Skickar till alla användare som inte checkat in än, baserat på projekt-inställningar.
            </p>
            <p>
              <strong>Cron check-out:</strong> Simulerar cron-jobbet som körs kl 16:45. Skickar till alla användare med aktiva time entries (ingen stop_at).
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              ⏰ Tidszon
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              <strong>Cron-test endpoints</strong> använder <strong>svensk tid (Europe/Stockholm)</strong> för att matcha hur cron-jobben fungerar i produktion.
              <br />
              <strong>Manuella tester</strong> (check-in/check-out för specifik användare) använder tiderna du anger direkt.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

