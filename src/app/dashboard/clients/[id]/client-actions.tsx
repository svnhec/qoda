"use client";

/**
 * Client Actions
 * =============================================================================
 * Action buttons for client detail page (activate/deactivate, delete).
 * =============================================================================
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleClientActive, deleteClient } from "../actions";
import type { Client } from "@/lib/db/types";

interface ClientActionsProps {
    client: Client;
}

export function ClientActions({ client }: ClientActionsProps) {
    const router = useRouter();
    const [isToggling, setIsToggling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleToggleActive() {
        setIsToggling(true);
        setError(null);

        const result = await toggleClientActive(client.id, !client.is_active);

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

        const result = await deleteClient(client.id);

        if (result.success) {
            router.push("/dashboard/clients");
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
                {client.is_active ? "Deactivate" : "Activate"}
            </Button>

            {/* Delete Button */}
            {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Are you sure?</span>
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
