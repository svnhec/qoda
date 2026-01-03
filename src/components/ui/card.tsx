import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * QODA CARD COMPONENT
 * =============================================================================
 * Standardized container with avionics styling.
 * Uses semantic tokens: bg-card, bg-secondary.
 * =============================================================================
 */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "metric" | "terminal" | "interactive" | "profit" | "alert";
    glass?: boolean;
  }
>(({ className, variant = "default", glass, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        // Base styles
        "rounded-xl border border-border text-card-foreground shadow-sm transition-all duration-200",

        // Variants
        {
          "default": "bg-card",
          "metric": "bg-card p-5",
          "terminal": "bg-black font-mono border-white/10",
          "interactive": "bg-card hover:border-primary/50 cursor-pointer hover:shadow-md",
          "profit": "bg-emerald-500/5 border-emerald-500/20",
          "alert": "bg-destructive/5 border-destructive/20",
        }[variant],

        // Glass Override
        glass && "bg-background/60 backdrop-blur-xl border-white/10",

        className
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
