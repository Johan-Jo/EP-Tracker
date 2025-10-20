import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
};

export function EmptyState({ 
    icon: Icon, 
    title, 
    description, 
    action, 
    secondaryAction 
}: EmptyStateProps) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                    <Icon className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                    {description}
                </p>
                {(action || secondaryAction) && (
                    <div className="flex gap-3">
                        {action && (
                            <Button onClick={action.onClick}>
                                {action.label}
                            </Button>
                        )}
                        {secondaryAction && (
                            <Button variant="outline" onClick={secondaryAction.onClick}>
                                {secondaryAction.label}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

