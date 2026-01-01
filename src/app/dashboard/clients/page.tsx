/**
 * Clients List Page
 * =============================================================================
 * Shows all clients for the organization with search and filters.
 * Uses Server Components for data fetching (RLS enforced).
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Users, MoreHorizontal, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Client } from "@/lib/db/types";

interface PageProps {
    searchParams: Promise<{
        search?: string;
        is_active?: string;
    }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/auth/login?redirect=/dashboard/clients");
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

    // Build query
    let query = supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

    // Apply search filter
    if (params.search) {
        query = query.ilike("name", `%${params.search}%`);
    }

    // Apply active filter
    if (params.is_active !== undefined) {
        query = query.eq("is_active", params.is_active === "true");
    }

    const { data: clients, error } = await query;

    if (error) {
        console.error("Failed to fetch clients:", error);
    }

    const clientList = (clients as Client[]) || [];
    const activeCount = clientList.filter((c) => c.is_active).length;
    const inactiveCount = clientList.filter((c) => !c.is_active).length;

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Clients</h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage your end-clients and their billing.
                    </p>
                </div>
                <Link href="/dashboard/clients/new">
                    <Button>
                        <Plus className="w-4 h-4" />
                        Add Client
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{clientList.length}</p>
                            <p className="text-sm text-muted-foreground">Total Clients</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                            <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{inactiveCount}</p>
                            <p className="text-sm text-muted-foreground">Inactive</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-4 mb-6">
                <form className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            name="search"
                            placeholder="Search clients..."
                            defaultValue={params.search}
                            className="pl-10"
                        />
                    </div>
                </form>
                <div className="flex gap-2">
                    <Link href="/dashboard/clients">
                        <Button variant={!params.is_active ? "default" : "outline"} size="sm">
                            All
                        </Button>
                    </Link>
                    <Link href="/dashboard/clients?is_active=true">
                        <Button variant={params.is_active === "true" ? "default" : "outline"} size="sm">
                            Active
                        </Button>
                    </Link>
                    <Link href="/dashboard/clients?is_active=false">
                        <Button variant={params.is_active === "false" ? "default" : "outline"} size="sm">
                            Inactive
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Clients Table */}
            {clientList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No clients yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Create your first client to start managing their AI agents.
                    </p>
                    <Link href="/dashboard/clients/new">
                        <Button>
                            <Plus className="w-4 h-4" />
                            Add Your First Client
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clientList.map((client) => (
                                <TableRow key={client.id}>
                                    <TableCell>
                                        <Link
                                            href={`/dashboard/clients/${client.id}`}
                                            className="font-medium text-foreground hover:text-primary transition-colors"
                                        >
                                            {client.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {client.contact_email && (
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {client.contact_email}
                                                </div>
                                            )}
                                            {client.contact_phone && (
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {client.contact_phone}
                                                </div>
                                            )}
                                            {!client.contact_email && !client.contact_phone && (
                                                <span className="text-sm text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${client.is_active
                                                    ? "bg-green-500/10 text-green-600"
                                                    : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            {client.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(client.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/dashboard/clients/${client.id}`}>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
