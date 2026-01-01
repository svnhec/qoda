"use client";

/**
 * Issue Card Button Component
 * =============================================================================
 * Client component for issuing virtual cards to agents.
 * Handles the API call, loading state, and success/error feedback.
 * =============================================================================
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IssueCardButtonProps {
    agentId: string;
    agentName: string;
    /** Whether the org has verified Stripe */
    canIssueCards: boolean;
    /** Whether the user is owner or admin */
    isAdminOrOwner: boolean;
    /** Whether the agent already has an active card */
    hasActiveCard: boolean;
    /** Monthly budget in cents (for default spend limit) */
    monthlyBudgetCents?: string;
}

interface CardResult {
    card_id: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    brand: string;
}

export function IssueCardButton({
    agentId,
    agentName,
    canIssueCards,
    isAdminOrOwner,
    hasActiveCard,
    monthlyBudgetCents,
}: IssueCardButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{
        type: "success" | "error";
        message: string;
        card?: CardResult;
    } | null>(null);

    // Determine if button should be disabled
    const isDisabled =
        !canIssueCards || !isAdminOrOwner || hasActiveCard || isLoading || isPending;

    // Determine tooltip/title text
    const getTitle = () => {
        if (hasActiveCard) return "Agent already has an active card";
        if (!canIssueCards) return "Connect and verify Stripe to issue cards";
        if (!isAdminOrOwner) return "Only owners and admins can issue cards";
        return `Issue a virtual card for ${agentName}`;
    };

    const handleIssueCard = async () => {
        if (isDisabled) return;

        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/v1/agents/issue-card", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    agent_id: agentId,
                    // Use agent's monthly budget as default spend limit
                    spend_limit_cents: monthlyBudgetCents,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setResult({
                    type: "error",
                    message: data.error || "Failed to issue card",
                });
                return;
            }

            // Success!
            setResult({
                type: "success",
                message: data.is_existing
                    ? "Card already exists for this agent"
                    : "Card issued successfully",
                card: data.card,
            });

            // Refresh the page to show the new card in the list
            startTransition(() => {
                router.refresh();
            });
        } catch (error) {
            console.error("Issue card error:", error);
            setResult({
                type: "error",
                message: "Network error. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <Button
                size="sm"
                onClick={handleIssueCard}
                disabled={isDisabled}
                title={getTitle()}
                className="gap-2"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Issuing...
                    </>
                ) : (
                    <>
                        <CreditCard className="w-4 h-4" />
                        Issue Card
                    </>
                )}
            </Button>

            {/* Result Feedback */}
            {result && (
                <div
                    className={`flex items-start gap-2 p-3 rounded-lg text-sm ${result.type === "success"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-destructive/10 text-destructive"
                        }`}
                >
                    {result.type === "success" ? (
                        <Check className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <div>
                        <p className="font-medium">{result.message}</p>
                        {result.card && (
                            <p className="mt-1 text-xs opacity-80">
                                {result.card.brand.toUpperCase()} •••• {result.card.last4} |
                                Exp: {result.card.exp_month.toString().padStart(2, "0")}/
                                {result.card.exp_year}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
