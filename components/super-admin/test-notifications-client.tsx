'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface NotificationType {
  value: string;
  label: string;
  description: string;
  defaultTitle: string;
  defaultBody: string;
}

interface TestNotificationsClientProps {
  users: User[];
  notificationTypes: NotificationType[];
}

export function TestNotificationsClient({ users, notificationTypes }: TestNotificationsClientProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('test');
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [url, setUrl] = useState<string>('/dashboard');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);

  // Update title and body when notification type changes
  const handleTypeChange = (typeValue: string) => {
    setSelectedType(typeValue);
    const type = notificationTypes.find((t) => t.value === typeValue);
    if (type) {
      setTitle(type.defaultTitle);
      setBody(type.defaultBody);
    }
  };

  const handleSend = async () => {
    if (!selectedUserId) {
      setResult({ success: false, message: 'Välj en användare' });
      return;
    }

    if (!title || !body) {
      setResult({ success: false, message: 'Fyll i titel och meddelande' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/super-admin/test-notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          type: selectedType,
          title,
          body,
          url: url || '/dashboard',
          skipQuietHours: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte skicka notifikation');
      }

      setResult({
        success: true,
        message: `Notifikation skickad till ${users.find((u) => u.id === selectedUserId)?.email}`,
        messageId: data.messageId,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Ett fel uppstod',
      });
    } finally {
      setSending(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const selectedTypeData = notificationTypes.find((t) => t.value === selectedType);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Skicka Testnotifikation</CardTitle>
          <CardDescription>
            Välj användare och typ av notifikation för att testa e-postfunktionaliteten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user">Användare</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Välj användare..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notification Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Typ av Notifikation</Label>
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {notificationTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTypeData && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedTypeData.description}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notifikationens titel"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Meddelande</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notifikationens meddelande"
              rows={4}
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url">Länk (valfritt)</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/dashboard"
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={sending || !selectedUserId || !title || !body}
            className="w-full"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Skicka Notifikation
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div
              className={`rounded-lg border p-4 ${
                result.success
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      result.success
                        ? 'text-green-900 dark:text-green-200'
                        : 'text-red-900 dark:text-red-200'
                    }`}
                  >
                    {result.success ? 'Skickat!' : 'Fel'}
                  </p>
                  <p
                    className={`mt-1 text-sm ${
                      result.success
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.messageId && (
                    <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                      Message ID: {result.messageId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Förhandsvisning</CardTitle>
          <CardDescription>
            Så här kommer notifikationen att se ut i e-post
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUser ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                <div className="mb-3 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-800">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Till: {selectedUser.email}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ämne:</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      🔔 {title || '(Ingen titel)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Meddelande:</p>
                    <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {body || '(Inget meddelande)'}
                    </p>
                  </div>
                  {url && (
                    <div className="pt-2">
                      <a
                        href={url}
                        className="inline-block rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                      >
                        Öppna i EP-Tracker
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Notifikationen kommer att skickas via e-post eftersom Firebase inte är konfigurerat.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Välj en användare för att se förhandsvisning
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

