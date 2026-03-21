import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, icon: Icon, trend, className }) {
  return (
    <Card className={cn("p-5 relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1.5 text-foreground">{value}</p>
          {trend && (
            <p className={cn("text-xs mt-1.5 font-medium", trend >= 0 ? "text-primary" : "text-destructive")}>
              {trend >= 0 ? '+' : ''}{trend}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}