"use client";

/**
 * Create New Client Page
 * =============================================================================
 * Form for creating a new client with validation.
 * Uses Server Actions for the actual creation.
 * =============================================================================
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientAction } from "../actions";

export default function NewClientPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const input = {
            name: formData.get("name") as string,
            contact_email: formData.get("contact_email") as string || null,
            contact_phone: formData.get("contact_phone") as string || null,
        };

        const result = await createClientAction(input);

        if (result.success) {
            router.push("/dashboard/clients");
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
                href="/dashboard/clients"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Clients
            </Link>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Add New Client</h1>
                <p className="mt-2 text-muted-foreground">
                    Create a new client to manage their AI agents and billing.
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
                    <Label htmlFor="name">Client Name *</Label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="e.g., Acme Corporation"
                        required
                        disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground">
                        The company or project name for this client.
                    </p>
                </div>

                {/* Contact Email */}
                <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        placeholder="billing@example.com"
                        disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground">
                        Primary email for billing and notifications.
                    </p>
                </div>

                {/* Contact Phone */}
                <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                        id="contact_phone"
                        name="contact_phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground">
                        Optional phone number for the client.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isLoading ? "Creating..." : "Create Client"}
                    </Button>
                    <Link href="/dashboard/clients">
                        <Button type="button" variant="outline" disabled={isLoading}>
                            Cancel
                        </Button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
