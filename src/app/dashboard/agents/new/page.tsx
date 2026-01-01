"use client";

/**
 * Create New Agent Page
 * =============================================================================
 * Form for creating a new agent.
 * Budget is input as dollars and converted to cents (BigInt) on submit.
 * =============================================================================
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgentAction } from "../actions";

interface Client {
    id: string;
    name: string;
}

export default function NewAgentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedClientId = searchParams.get("client_id");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(true);

    // Fetch clients for the dropdown
    useEffect(() => {
        async function fetchClients() {
            try {
                const response = await fetch("/api/clients");
                if (response.ok) {
                    const data = await response.json();
                    setClients(data.clients || []);
                }
            } catch (err) {
                console.error("Failed to fetch clients:", err);
            } finally {
                setLoadingClients(false);
            }
        }
        fetchClients();
    }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const input = {
            name: formData.get("name") as string,
            description: (formData.get("description") as string) || null,
            client_id: (formData.get("client_id") as string) || null,
            monthly_budget_dollars: formData.get("monthly_budget") as string || "0",
        };

        const result = await createAgentAction(input);

        if (result.success) {
            router.push("/dashboard/agents");
            router.refresh();
        } else {
            setError(result.error);
            setIsLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-12">
            {/* Back Link */}
            <Link
                href="/dashboard/agents"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Agents
            </Link>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Add New Agent</h1>
                <p className="mt-2 text-muted-foreground">
                    Create a new AI agent with a monthly spending budget.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                    <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                        {error}
                    </div>
                )}

                {/* Name */}
                <div className="space-y-2">
                    <Label htmlFor="name">Agent Name *</Label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="e.g., Sales Outreach Agent"
                        required
                        disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground">
                        A descriptive name for this AI agent.
                    </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                        id="description"
                        name="description"
                        placeholder="What does this agent do?"
                        disabled={isLoading}
                        className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                {/* Client */}
                <div className="space-y-2">
                    <Label htmlFor="client_id">Client (Optional)</Label>
                    <select
                        id="client_id"
                        name="client_id"
                        defaultValue={preselectedClientId || ""}
                        disabled={isLoading || loadingClients}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">No client (internal agent)</option>
                        {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                                {client.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-sm text-muted-foreground">
                        Associate this agent with a client for billing purposes.
                    </p>
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
                            placeholder="0.00"
                            defaultValue=""
                            disabled={isLoading}
                            className="pl-7"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Maximum spend allowed per month. Leave empty or 0 for unlimited.
                    </p>
                </div>

                {/* Info Box */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Note:</strong> After creating the agent,
                        you&apos;ll be able to issue virtual cards for it once your Stripe Connect
                        account is verified.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isLoading ? "Creating..." : "Create Agent"}
                    </Button>
                    <Link href="/dashboard/agents">
                        <Button type="button" variant="outline" disabled={isLoading}>
                            Cancel
                        </Button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
