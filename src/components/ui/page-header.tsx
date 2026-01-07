import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconColor?: "blue" | "green" | "purple" | "orange" | "red" | "pink";
  actions?: ReactNode;
  className?: string;
}

const iconColorClasses = {
  blue: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
  green: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
  purple: "bg-purple-500/10 text-purple-500 dark:bg-purple-500/20",
  orange: "bg-orange-500/10 text-orange-500 dark:bg-orange-500/20",
  red: "bg-red-500/10 text-red-500 dark:bg-red-500/20",
  pink: "bg-pink-500/10 text-pink-500 dark:bg-pink-500/20",
};

const borderColorClasses = {
  blue: "from-blue-500 to-blue-600",
  green: "from-emerald-500 to-emerald-600",
  purple: "from-purple-500 to-purple-600",
  orange: "from-orange-500 to-orange-600",
  red: "from-red-500 to-red-600",
  pink: "from-pink-500 to-pink-600",
};

export function PageHeader({
  title,
  description,
  icon,
  iconColor = "blue",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Gradient border accent */}
          <div className={cn("hidden sm:block w-1 h-12 rounded-full bg-gradient-to-b", borderColorClasses[iconColor])} />
          
          {/* Icon */}
          {icon && (
            <div className={cn("p-3 rounded-xl", iconColorClasses[iconColor])}>
              {icon}
            </div>
          )}
          
          {/* Title and description */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
