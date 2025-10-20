'use client';

import { Component, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to error tracking service (Sentry, etc.)
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <Card className="max-w-md w-full">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-8 h-8 text-destructive" />
                                <div>
                                    <CardTitle>Något gick fel</CardTitle>
                                    <CardDescription>
                                        Ett oväntat fel uppstod i applikationen
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                <p className="font-mono text-xs break-all">
                                    {this.state.error?.message || 'Okänt fel'}
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="w-full"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Ladda om sidan
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.href = '/dashboard'}
                                    className="w-full"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Gå till startsidan
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground text-center">
                                Om problemet kvarstår, kontakta support
                            </p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

