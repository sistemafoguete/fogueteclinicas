import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "blue" | "green" | "purple" | "orange" | "red" | "pink";
  className?: string;
  onClick?: () => void;
}

const variantClasses = {
  default: {
    card: "hover:border-primary/30 hover:shadow-primary/5",
    icon: "bg-primary/10 text-primary",
    gradient: "from-primary/5 to-transparent",
  },
  blue: {
    card: "hover:border-blue-500/30 hover:shadow-blue-500/5",
    icon: "bg-blue-500/10 text-blue-500",
    gradient: "from-blue-500/5 to-transparent",
  },
  green: {
    card: "hover:border-emerald-500/30 hover:shadow-emerald-500/5",
    icon: "bg-emerald-500/10 text-emerald-500",
    gradient: "from-emerald-500/5 to-transparent",
  },
  purple: {
    card: "hover:border-purple-500/30 hover:shadow-purple-500/5",
    icon: "bg-purple-500/10 text-purple-500",
    gradient: "from-purple-500/5 to-transparent",
  },
  orange: {
    card: "hover:border-orange-500/30 hover:shadow-orange-500/5",
    icon: "bg-orange-500/10 text-orange-500",
    gradient: "from-orange-500/5 to-transparent",
  },
  red: {
    card: "hover:border-red-500/30 hover:shadow-red-500/5",
    icon: "bg-red-500/10 text-red-500",
    gradient: "from-red-500/5 to-transparent",
  },
  pink: {
    card: "hover:border-pink-500/30 hover:shadow-pink-500/5",
    icon: "bg-pink-500/10 text-pink-500",
    gradient: "from-pink-500/5 to-transparent",
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className,
  onClick,
}: StatsCardProps) {
  const styles = variantClasses[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative group overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1",
        styles.card,
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Background gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", styles.gradient)} />
      
      {/* Content */}
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded",
                  trend.isPositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        {/* Icon */}
        <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", styles.icon)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
