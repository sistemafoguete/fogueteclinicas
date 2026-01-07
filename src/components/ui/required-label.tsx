import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface RequiredLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
}

const RequiredLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  RequiredLabelProps
>(({ className, children, required = false, ...props }, ref) => (
  <Label ref={ref} className={cn(className)} {...props}>
    {children}
    {required && <span className="text-destructive ml-1">*</span>}
    {required && (
      <span className="text-xs text-muted-foreground ml-2 font-normal">
        Campo obrigatório
      </span>
    )}
  </Label>
));

RequiredLabel.displayName = "RequiredLabel";

export { RequiredLabel };
