"use client";

/**
 * Agent Edit Form
 * =============================================================================
 * Form for editing an existing agent.
 * Budget is input as dollars and converted to cents on submit.
 * =============================================================================
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAgentAction } from "../actions";
import type { Agent } from "@/lib/db/types";

interface AgentEditFormProps {
    agent: Agent;
    clients: { id: string; name: string }[];
    defaultBudgetDollars: string;
}

export function AgentEditForm({ agent, clients, defaultBudgetDollars }: AgentEditFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        const formData = new FormData(e.currentTarget);
        const input = {
            name: formData.get("name") as string,
            description: (formData.get("description") as string) || null,
            client_id: (formData.get("client_id") as string) || null,
            monthly_budget_dollars: formData.get("monthly_budget") as string || "0",
        };

        const result = await updateAgentAction(agent.id, input);

        if (result.success) {
            setSuccess(true);
            router.refresh();
            setTimeout(() => setSuccess(false), 3000);
        } else {
            setError(result.error);
        }

        setIsLoading(false);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="p-4 rounded-lg bg-green-500/10 text-green-600 text-sm">
                    Agent updated successfully!
                </div>
            )}

            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={agent.name}
                    required
                    disabled={isLoading}
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                    id="description"
                    name="description"
                    defaultValue={agent.description || ""}
                    disabled={isLoading}
                    className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

            {/* Client */}
            <div className="space-y-2">
                <Label htmlFor="client_id">Client</Label>
                <select
                    id="client_id"
                    name="client_id"
                    defaultValue={agent.client_id || ""}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="">No client (internal agent)</option>
                    {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {client.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Monthly Budget */}
            <div className="space-y-2">
                <Label htmlFor="monthly_budget">Monthly Budget</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                    </span>
                    <Input
                        id="monthly_budget"
                        name="monthly_budget"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={defaultBudgetDollars}
                        disabled={isLoading}
                        className="pl-7"
                    />
                </div>
                <p className="text-sm text-muted-foreground">
                    Maximum spend allowed per month.
                </p>
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? "Saving..." : "Save Changes"}
            </Button>
        </form>
    );
}
