import * as React from "react";
import { cn } from "../../lib/utils";

const ToggleGroupContext = React.createContext({
    variant: "default",
    size: "default",
});

const toggleGroupVariants = {
    default: "bg-transparent",
    outline: "border border-input bg-transparent",
};

const toggleGroupItemVariants = {
    default: "bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
    outline: "border-0 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
};

const toggleGroupSizes = {
    default: "h-10 px-3",
    sm: "h-9 px-2.5",
    lg: "h-11 px-5",
};

const ToggleGroup = React.forwardRef(
    ({ className, variant = "default", size = "default", type = "single", value, onValueChange, children, ...props }, ref) => {
        const [internalValue, setInternalValue] = React.useState(value);

        React.useEffect(() => {
            setInternalValue(value);
        }, [value]);

        const handleValueChange = (newValue) => {
            if (type === "single") {
                setInternalValue(newValue);
                onValueChange?.(newValue);
            }
        };

        return (
            <ToggleGroupContext.Provider value={{ variant, size, value: internalValue, onValueChange: handleValueChange }}>
                <div
                    ref={ref}
                    className={cn(
                        "inline-flex items-center justify-center gap-1 rounded-md",
                        toggleGroupVariants[variant],
                        className
                    )}
                    {...props}
                >
                    {children}
                </div>
            </ToggleGroupContext.Provider>
        );
    }
);
ToggleGroup.displayName = "ToggleGroup";

const ToggleGroupItem = React.forwardRef(
    ({ className, value, children, ...props }, ref) => {
        const context = React.useContext(ToggleGroupContext);
        const isActive = context.value === value;

        return (
            <button
                ref={ref}
                type="button"
                data-state={isActive ? "on" : "off"}
                onClick={() => context.onValueChange?.(value)}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    toggleGroupItemVariants[context.variant],
                    toggleGroupSizes[context.size],
                    className
                )}
                {...props}
            >
                {children}
            </button>
        );
    }
);
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
