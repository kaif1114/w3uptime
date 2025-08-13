"use client";

import { ReactNode } from "react";

interface MonitorsHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function MonitorsHeader({ title, description, action }: MonitorsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export default MonitorsHeader; 