/**
 * Client Detail Page
 * =============================================================================
 * Shows client details and allows editing.
 * Uses Server Components for data fetching.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Client, Agent } from "@/lib/db/types";
import { ClientEditForm } from "./client-edit-form";
import { ClientActions } from "./client-actions";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
    const { id: clientId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect(`/auth/login?redirect=/dashboard/clients/${clientId}`);
    }

    // Get user's default organization
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) {
        redirect("/dashboard?error=no_organization");
    }

    const organizationId = profile.default_organization_id;

    // Get client (RLS will enforce org access)
    const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .eq("organization_id", organizationId)
        .single();

    if (clientError || !client) {
        notFound();
    }

    // Get agents for this client
    const { data: agents } = await supabase
        .from("agents")
        .select("id, name, is_active")
        .eq("client_id", clientId)
        .order("name");

    const agentList = (agents || []) as Pick<Agent, "id" | "name" | "is_active">[];
    const typedClient = client as Client;

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Back Link */}
            <Link
                href="/dashboard/clients"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Clients
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-foreground">{typedClient.name}</h1>
                        <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typedClient.is_active
                                    ? "bg-green-500/10 text-green-600"
                                    : "bg-muted text-muted-foreground"
                                }`}
                        >
                            {typedClient.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <p className="mt-2 text-muted-foreground">
                        Created on {new Date(typedClient.created_at).toLocaleDateString()}
                    </p>
                </div>
                <ClientActions client={typedClient} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{agentList.length}</p>
                            <p className="text-sm text-muted-foreground">Agents</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">
                                {agentList.filter((a) => a.is_active).length}
                            </p>
                            <p className="text-sm text-muted-foreground">Active Agents</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">
                                {Math.floor(
                                    (Date.now() - new Date(typedClient.created_at).getTime()) / (1000 * 60 * 60 * 24)
                                )}
                            </p>
                            <p className="text-sm text-muted-foreground">Days Active</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-8">
                {/* Client Details Form */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-6">Client Details</h2>
                    <ClientEditForm client={typedClient} />
                </div>

                {/* Agents List */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-foreground">Agents</h2>
                        <Link href={`/dashboard/agents/new?client_id=${clientId}`}>
                            <Button size="sm">Add Agent</Button>
                        </Link>
                    </div>

                    {agentList.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border rounded-lg">
                            <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground mb-4">No agents yet</p>
                            <Link href={`/dashboard/agents/new?client_id=${clientId}`}>
                                <Button size="sm">Create First Agent</Button>
                            </Link>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {agentList.map((agent) => (
                                <li key={agent.id}>
                                    <Link
                                        href={`/dashboard/agents/${agent.id}`}
                                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                    >
                                        <span className="font-medium text-foreground">{agent.name}</span>
                                        <span
                                            className={`inline-flex items-center gap-1 text-xs ${agent.is_active ? "text-green-600" : "text-muted-foreground"
                                                }`}
                                        >
                                            {agent.is_active ? (
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            ) : (
                                                <XCircle className="w-3.5 h-3.5" />
                                            )}
                                            {agent.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
