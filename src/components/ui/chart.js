import * as React from "react";
import { cn } from "../../lib/utils";

const ChartContainer = React.forwardRef(({ className, config, children, ...props }, ref) => {
    // Generate CSS variables from config
    const cssVars = React.useMemo(() => {
        if (!config) return {};
        return Object.entries(config).reduce((acc, [key, value]) => {
            if (value.color) {
                acc[`--color-${key}`] = value.color;
            }
            return acc;
        }, {});
    }, [config]);

    return (
        <div
            ref={ref}
            className={cn("flex aspect-video justify-center text-xs", className)}
            style={cssVars}
            {...props}
        >
            {children}
        </div>
    );
});
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = ({ content, ...props }) => {
    return content;
};

const ChartTooltipContent = React.forwardRef(
    ({ className, indicator = "dot", hideLabel = false, hideIndicator = false, label, payload, labelFormatter, ...props }, ref) => {
        if (!payload?.length) return null;

        return (
            <div
                ref={ref}
                className={cn(
                    "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
                    className
                )}
                {...props}
            >
                {!hideLabel && label && (
                    <div className="font-medium">
                        {labelFormatter ? labelFormatter(label) : label}
                    </div>
                )}
                <div className="grid gap-1.5">
                    {payload.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            {!hideIndicator && (
                                <div
                                    className={cn(
                                        "shrink-0 rounded-[2px]",
                                        indicator === "dot" && "h-2.5 w-2.5",
                                        indicator === "line" && "h-0.5 w-4"
                                    )}
                                    style={{ backgroundColor: item.color || item.fill }}
                                />
                            )}
                            <div className="flex flex-1 justify-between gap-2">
                                <span className="text-muted-foreground">{item.name}</span>
                                <span className="font-mono font-medium tabular-nums">
                                    {typeof item.value === 'number'
                                        ? item.value.toLocaleString('id-ID')
                                        : item.value}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = ({ content, ...props }) => {
    return content;
};

const ChartLegendContent = React.forwardRef(
    ({ className, payload, verticalAlign = "bottom", ...props }, ref) => {
        if (!payload?.length) return null;

        return (
            <div
                ref={ref}
                className={cn(
                    "flex items-center justify-center gap-4",
                    verticalAlign === "top" && "pb-3",
                    className
                )}
                {...props}
            >
                {payload.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                        <div
                            className="h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-muted-foreground">{item.value}</span>
                    </div>
                ))}
            </div>
        );
    }
);
ChartLegendContent.displayName = "ChartLegendContent";

export {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
};
