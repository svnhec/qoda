"use client";

/**
 * Agent Actions
 * =============================================================================
 * Action buttons for agent detail page (activate/deactivate, delete).
 * =============================================================================
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleAgentActive, deleteAgentAction } from "../actions";
import type { Agent } from "@/lib/db/types";

interface AgentActionsProps {
    agent: Agent;
}

export function AgentActions({ agent }: AgentActionsProps) {
    const router = useRouter();
    const [isToggling, setIsToggling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleToggleActive() {
        setIsToggling(true);
        setError(null);

        const result = await toggleAgentActive(agent.id, !agent.is_active);

        if (result.success) {
            router.refresh();
        } else {
            setError(result.error);
        }

        setIsToggling(false);
    }

    async function handleDelete() {
        setIsDeleting(true);
        setError(null);

        const result = await deleteAgentAction(agent.id);

        if (result.success) {
            router.push("/dashboard/agents");
            router.refresh();
        } else {
            setError(result.error);
            setIsDeleting(false);
        }
    }

    return (
        <div className="flex items-center gap-2">
            {error && (
                <span className="text-sm text-destructive mr-2">{error}</span>
            )}

            {/* Toggle Active Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                disabled={isToggling || isDeleting}
            >
                {isToggling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Power className="w-4 h-4" />
                )}
                {agent.is_active ? "Deactivate" : "Activate"}
            </Button>

            {/* Delete Button */}
            {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Delete agent?</span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            "Yes, Delete"
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                </div>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isToggling}
                    className="text-destructive hover:text-destructive"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete
                </Button>
            )}
        </div>
    );
}
