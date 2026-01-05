/**
 * Clients Hook
 * =============================================================================
 * React hook for fetching clients from the API.
 * =============================================================================
 */

import { useState, useEffect, useCallback } from "react";

export interface Client {
    id: string;
    name: string;
}

interface UseClientsResult {
    clients: Client[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useClients(): UseClientsResult {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchClients = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/clients");
            
            if (res.status === 401) {
                setError("Please log in to view clients");
                return;
            }

            const data = await res.json();
            
            if (res.ok) {
                setClients(data.clients || []);
            } else {
                setError(data.error || "Failed to fetch clients");
            }
        } catch (err) {
            console.error("Clients fetch error:", err);
            setError("Failed to load clients");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    return {
        clients,
        isLoading,
        error,
        refresh: fetchClients,
    };
}

