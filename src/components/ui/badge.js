import * as React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input",
    success: "bg-green-500/10 text-green-500 border border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
};

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
            badgeVariants[variant],
            className
        )}
        {...props}
    />
));
Badge.displayName = "Badge";

export { Badge, badgeVariants };
