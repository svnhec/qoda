/**
 * Agents Hook
 * =============================================================================
 * React hook for fetching and managing agents from the API.
 * =============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { type Agent } from "@/hooks/use-dashboard-data";

interface UseAgentsResult {
    agents: Agent[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    createAgent: (data: CreateAgentData) => Promise<{ success: boolean; error?: string; agent?: Agent }>;
}

interface CreateAgentData {
    name: string;
    description?: string;
    client_id?: string;
    monthly_budget_cents?: number;
}

export function useAgents(): UseAgentsResult {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAgents = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/agents");
            
            if (res.status === 401) {
                setError("Please log in to view agents");
                return;
            }

            const data = await res.json();
            
            if (res.ok) {
                setAgents(data.agents || []);
            } else {
                setError(data.error || "Failed to fetch agents");
            }
        } catch (err) {
            console.error("Agents fetch error:", err);
            setError("Failed to load agents");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createAgent = useCallback(async (data: CreateAgentData) => {
        try {
            const res = await fetch("/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (res.ok) {
                // Refresh agents list
                await fetchAgents();
                return { success: true, agent: result.agent };
            } else {
                return { success: false, error: result.error || "Failed to create agent" };
            }
        } catch (err) {
            console.error("Create agent error:", err);
            return { success: false, error: "Failed to create agent" };
        }
    }, [fetchAgents]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    return {
        agents,
        isLoading,
        error,
        refresh: fetchAgents,
        createAgent,
    };
}

