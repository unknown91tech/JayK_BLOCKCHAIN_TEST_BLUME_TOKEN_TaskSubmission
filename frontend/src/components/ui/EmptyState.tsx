import { ReactNode } from 'react';
import { DivideIcon as LucideIcon, Activity, AlertCircle, FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  // Choose icon based on the provided name
  const IconComponent: LucideIcon = 
    icon === 'activity' ? Activity :
    icon === 'alert' ? AlertCircle :
    FileQuestion;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <IconComponent className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {description}
      </p>
      {action}
    </div>
  );
}