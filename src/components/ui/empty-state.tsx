import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-white/10 bg-white/5",
            "animate-in fade-in zoom-in-95 duration-500",
            className
        )}>
            <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center mb-6 shadow-xl">
                <Icon className="w-8 h-8 text-white/40" />
            </div>

            <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
            <p className="text-white/40 text-sm max-w-sm mb-6 leading-relaxed">
                {description}
            </p>

            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
}
