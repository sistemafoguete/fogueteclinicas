import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Column<T> {
  key: string;
  header: string | ReactNode;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface EnhancedTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  loadingRows?: number;
  emptyState?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  selectedRow?: number | null;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

export function EnhancedTable<T>({
  columns,
  data,
  isLoading = false,
  loadingRows = 5,
  emptyState,
  onRowClick,
  selectedRow,
  className,
  striped = true,
  hoverable = true,
  compact = false,
}: EnhancedTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "font-semibold text-foreground",
                    compact ? "py-2" : "py-3",
                    column.headerClassName
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: loadingRows }).map((_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={compact ? "py-2" : "py-3"}>
                    <Skeleton className="h-5 w-full max-w-[200px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "font-semibold text-foreground",
                    compact ? "py-2" : "py-3",
                    column.headerClassName
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          {emptyState || "Nenhum registro encontrado"}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "font-semibold text-foreground",
                    compact ? "py-2 px-3" : "py-3 px-4",
                    column.headerClassName
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={index}
                onClick={() => onRowClick?.(row, index)}
                className={cn(
                  "transition-colors",
                  striped && index % 2 === 1 && "bg-muted/20",
                  hoverable && "hover:bg-muted/40",
                  onRowClick && "cursor-pointer",
                  selectedRow === index && "bg-primary/10 hover:bg-primary/15"
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      compact ? "py-2 px-3" : "py-3 px-4",
                      column.className
                    )}
                  >
                    {column.cell(row, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Status badge component for common use in tables
interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const statusVariants = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export function StatusBadge({ status, variant = "default", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        statusVariants[variant],
        className
      )}
    >
      {status}
    </span>
  );
}

// Unit badge with color coding
interface UnitBadgeProps {
  unit: string;
  className?: string;
}

export function UnitBadge({ unit, className }: UnitBadgeProps) {
  const getUnitStyles = (unit: string) => {
    const unitLower = unit?.toLowerCase() || "";
    if (unitLower.includes("madre")) {
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
    if (unitLower.includes("atendimento") && unitLower.includes("floresta")) {
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    }
    if (unitLower.includes("floresta")) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        getUnitStyles(unit),
        className
      )}
    >
      {unit || "Sem unidade"}
    </span>
  );
}
