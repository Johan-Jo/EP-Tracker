'use client';

import { useState } from 'react';
import { useNotificationPermission } from '@/lib/hooks/use-notification-permission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Check, X, Loader2 } from 'lucide-react';

export default function NotificationsPage() {
  const { permission, isSupported, isLoading, requestPermission } = useNotificationPermission();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testErrorMessage, setTestErrorMessage] = useState<string>('');

  const handleEnableNotifications = async () => {
    const success = await requestPermission();
    if (success) {
      console.log('✅ Notifications enabled');
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestErrorMessage('');

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      });

      if (response.ok) {
        setTestResult('success');
      } else {
        const data = await response.json();
        setTestResult('error');
        setTestErrorMessage(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      setTestResult('error');
      setTestErrorMessage(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsTesting(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-3xl font-bold mb-6">Pushnotiser</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-600">⚠️ Inte stöd</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Din webbläsare eller enhet stöder inte pushnotiser.
            </p>
            <p className="text-sm text-muted-foreground">
              För att använda pushnotiser, prova:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
              <li>Chrome, Firefox eller Edge på desktop</li>
              <li>Chrome eller Firefox på Android</li>
              <li>Safari på iOS (installera appen på hemskärmen först)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Pushnotiser</h1>

      {/* Permission Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notiseringsstatus
          </CardTitle>
          <CardDescription>
            Håll dig uppdaterad med realtidsnotiser
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permission === 'default' && (
            <div>
              <p className="mb-4">
                Du har inte aktiverat pushnotiser än. Aktivera för att få påminnelser och
                uppdateringar.
              </p>
              <Button onClick={handleEnableNotifications} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aktiverar...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Aktivera notiser
                  </>
                )}
              </Button>
            </div>
          )}

          {permission === 'granted' && (
            <div>
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <Check className="w-5 h-5" />
                <span className="font-medium">Notiser är aktiverade!</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Du får nu pushnotiser för check-ins, godkännanden och andra viktiga händelser.
              </p>
              <Button variant="outline" onClick={handleTestNotification} disabled={isTesting}>
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Skicka test-notis
                  </>
                )}
              </Button>

              {testResult === 'success' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                  ✅ Test-notis skickad! Kolla din enhet.
                </div>
              )}

              {testResult === 'error' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                  <p className="font-semibold mb-1">❌ Kunde inte skicka test-notis</p>
                  {testErrorMessage && (
                    <p className="text-xs whitespace-pre-wrap">{testErrorMessage}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {permission === 'denied' && (
            <div>
              <div className="flex items-center gap-2 text-red-600 mb-4">
                <X className="w-5 h-5" />
                <span className="font-medium">Notiser blockerade</span>
              </div>
              <p className="mb-4">
                Du har blockerat notiser för denna webbplats. För att aktivera igen:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Klicka på låsikonen i adressfältet</li>
                <li>Hitta &quot;Notiser&quot; i listan</li>
                <li>Ändra till &quot;Tillåt&quot;</li>
                <li>Ladda om sidan</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What notifications you'll get */}
      {permission === 'granted' && (
        <Card>
          <CardHeader>
            <CardTitle>Vilka notiser får jag?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="font-medium">Check-out påminnelser</p>
                  <p className="text-sm text-muted-foreground">
                    Påminnelse att checka ut i slutet av arbetsdagen
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">👷</span>
                <div>
                  <p className="font-medium">Team check-ins</p>
                  <p className="text-sm text-muted-foreground">
                    Se när ditt team checkar in och ut (endast för arbetsledare och admins)
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-medium">Godkännanden</p>
                  <p className="text-sm text-muted-foreground">
                    När din tidrapport eller utgifter godkänns
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

