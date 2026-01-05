"use client";

/**
 * Client Edit Form
 * =============================================================================
 * Form for editing an existing client.
 * =============================================================================
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClient } from "../actions";
import type { Client } from "@/lib/db/types";

interface ClientEditFormProps {
    client: Client;
}

export function ClientEditForm({ client }: ClientEditFormProps) {
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
            contact_email: (formData.get("contact_email") as string) || null,
            contact_phone: (formData.get("contact_phone") as string) || null,
        };

        const result = await updateClient(client.id, input);

        if (result.success) {
            setSuccess(true);
            router.refresh();
            // Clear success message after 3 seconds
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
                    Client updated successfully!
                </div>
            )}

            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={client.name}
                    required
                    disabled={isLoading}
                />
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={client.contact_email || ""}
                    disabled={isLoading}
                />
            </div>

            {/* Contact Phone */}
            <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                    id="contact_phone"
                    name="contact_phone"
                    type="tel"
                    defaultValue={client.contact_phone || ""}
                    disabled={isLoading}
                />
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? "Saving..." : "Save Changes"}
            </Button>
        </form>
    );
}
