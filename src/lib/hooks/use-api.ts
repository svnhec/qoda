/**
 * API Hooks with SWR Caching
 * =============================================================================
 * Provides cached, auto-refreshing API hooks for all dashboard data.
 * Uses SWR for intelligent caching and background updates.
 * =============================================================================
 */

import useSWR, { mutate } from 'swr';
import { logger } from '@/lib/logger';

// Generic fetcher function
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

// Custom fetcher with error logging
const loggedFetcher = async (url: string) => {
  try {
    logger.apiRequest('GET', url, 0);
    const startTime = Date.now();
    const data = await fetcher(url);
    const duration = Date.now() - startTime;
    logger.apiRequest('GET', url, 200, duration);
    return data;
  } catch (error) {
    logger.apiRequest('GET', url, 500);
    throw error;
  }
};

// Types for API responses
export interface Agent {
  id: string;
  name: string;
  is_active: boolean;
  monthly_budget_cents: number;
  created_at: string;
  spend_today_cents: number;
  transaction_count_today: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  total_revenue_cents: number;
  transaction_count: number;
  last_transaction_at: string | null;
  created_at: string;
}

export interface DashboardMetrics {
  totalAgents: number;
  activeAgents: number;
  totalSpendToday: number;
  totalRevenueToday: number;
  agentVelocity: number;
  topPerformingAgent: {
    id: string;
    name: string;
    spendToday: number;
  } | null;
}

export interface Transaction {
  id: string;
  agent_id: string;
  client_id?: string;
  amount_cents: number;
  description: string;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  agent_id?: string;
  created_at: string;
}

// Dashboard hooks
export function useDashboardMetrics() {
  return useSWR<DashboardMetrics>('/api/dashboard/metrics', loggedFetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10000, // Dedupe requests within 10 seconds
  });
}

export function useAgents() {
  return useSWR<Agent[]>('/api/agents', loggedFetcher, {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

export function useAgent(id: string) {
  return useSWR<Agent>(`/api/agents/${id}`, loggedFetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
}

export function useClients() {
  return useSWR<Client[]>('/api/clients', loggedFetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

export function useClient(id: string) {
  return useSWR<Client>(`/api/clients/${id}`, loggedFetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
}

export function useAgentLogs(agentId?: string) {
  const url = agentId ? `/api/agents/logs?agent_id=${agentId}` : '/api/agents/logs';
  return useSWR<LogEntry[]>(url, loggedFetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds for logs
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

export function useTransactions(agentId?: string, limit = 50) {
  const params = new URLSearchParams();
  if (agentId) params.set('agent_id', agentId);
  params.set('limit', limit.toString());

  return useSWR<Transaction[]>(`/api/transactions?${params}`, loggedFetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
}

export function useBillingData(organizationId: string, period = '30d') {
  return useSWR(`/api/billing/data?org=${organizationId}&period=${period}`, loggedFetcher, {
    refreshInterval: 300000, // Refresh every 5 minutes for billing data
    revalidateOnFocus: false, // Don't refresh on focus for expensive queries
  });
}

// Mutation hooks for updating data
export function useAgentMutation() {
  const { mutate: localMutate } = useSWR<Agent[]>('/api/agents', loggedFetcher);

  const createAgent = async (data: {
    name: string;
    monthly_budget_cents: number;
    soft_limit_cents_per_minute: number;
    hard_limit_cents_per_minute: number;
  }) => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.statusText}`);
      }

      const newAgent = await response.json();

      // Invalidate and refetch agents list
      localMutate();

      logger.info('Agent created successfully', { agentId: newAgent.id });
      return newAgent;
    } catch (error) {
      logger.error('Failed to create agent', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };

  const updateAgent = async (id: string, data: Partial<Agent>) => {
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.statusText}`);
      }

      // Invalidate agents list and specific agent cache
      localMutate();
      mutate(`/api/agents/${id}`);

      logger.info('Agent updated successfully', { agentId: id });
    } catch (error) {
      logger.error('Failed to update agent', { agentId: id, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete agent: ${response.statusText}`);
      }

      // Invalidate agents list
      localMutate();

      logger.info('Agent deleted successfully', { agentId: id });
    } catch (error) {
      logger.error('Failed to delete agent', { agentId: id, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };

  return { createAgent, updateAgent, deleteAgent };
}

export function useClientMutation() {
  const { mutate: localMutate } = useSWR<Client[]>('/api/clients', loggedFetcher);

  const createClient = async (data: {
    name: string;
    email: string;
    company?: string;
  }) => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create client: ${response.statusText}`);
      }

      const newClient = await response.json();

      // Invalidate and refetch clients list
      localMutate();

      logger.info('Client created successfully', { clientId: newClient.id });
      return newClient;
    } catch (error) {
      logger.error('Failed to create client', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };

  const updateClient = async (id: string, data: Partial<Client>) => {
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update client: ${response.statusText}`);
      }

      // Invalidate clients list and specific client cache
      localMutate();
      mutate(`/api/clients/${id}`);

      logger.info('Client updated successfully', { clientId: id });
    } catch (error) {
      logger.error('Failed to update client', { clientId: id, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };

  return { createClient, updateClient };
}

// Utility hooks
export function useOnlineStatus() {
  const { data: isOnline } = useSWR('online-status', () => {
    return navigator.onLine;
  }, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  return isOnline ?? true;
}

export function useRealtimeConnection() {
  const { data: isConnected } = useSWR('realtime-status', () => {
    // Check if WebSocket or Server-Sent Events are connected
    // This would need to be implemented based on your real-time setup
    return true; // Placeholder
  }, {
    refreshInterval: 30000,
  });

  return isConnected ?? true;
}

// Error handling utility
export function handleApiError(error: unknown, context: string) {
  // Type guard for error objects with status
  const isApiError = (err: unknown): err is { status: number; message: string } => {
    return typeof err === 'object' && err !== null && 'status' in err && 'message' in err;
  };

  if (isApiError(error)) {
    if (error.status === 401) {
      logger.warn('Unauthorized API access', { context });
      // Redirect to login if needed
    } else if (error.status === 403) {
      logger.warn('Forbidden API access', { context });
    } else if (error.status >= 500) {
      logger.error('Server error', { context, error: error.message });
    } else {
      logger.error('API error', { context, error: error.message });
    }
  } else {
    logger.error('API error', { context, error: String(error) });
  }

  throw error;
}
