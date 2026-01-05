import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * QODA INPUT COMPONENT
 * =============================================================================
 * Refined input using semantic tokens.
 * =============================================================================
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    financial?: boolean;
    error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, financial, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",

                    // Error state handled slightly differently in this simple version or via ring color
                    error && "border-destructive ring-destructive",

                    // Financial variant
                    financial && "font-mono tabular-nums slashed-zero",

                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

/**
 * Input with label wrapper
 */
interface InputFieldProps extends InputProps {
    label?: string;
    hint?: string;
    errorMessage?: string;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
    ({ label, hint, errorMessage, error, className, ...props }, ref) => {
        const hasError = error || !!errorMessage;

        return (
            <div className={cn("space-y-2", className)}>
                {label && (
                    <label className="block text-sm font-medium text-muted-foreground">
                        {label}
                    </label>
                )}
                <Input ref={ref} error={hasError} {...props} />
                {hint && !hasError && (
                    <p className="text-xs text-muted-foreground">{hint}</p>
                )}
                {errorMessage && (
                    <p className="text-xs text-destructive">{errorMessage}</p>
                )}
            </div>
        );
    }
);
InputField.displayName = "InputField";

export { Input, InputField };
