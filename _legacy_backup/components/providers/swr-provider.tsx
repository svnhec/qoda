/**
 * SWR Provider Component
 * =============================================================================
 * Provides SWR configuration and caching context to the entire application.
 * =============================================================================
 */

'use client';

import { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { logger } from '@/lib/logger';

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global fetcher
        fetcher: async (url: string) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        },

        // Global configuration
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5000, // 5 seconds
        focusThrottleInterval: 5000,

        // Error handling
        onError: (error, key) => {
          logger.error('SWR Error', {
            error: error.message,
            key,
            stack: error.stack
          });
        },

        // Loading states
        loadingTimeout: 3000,

        // Retry configuration
        shouldRetryOnError: true,
        errorRetryCount: 3,

        // Cache configuration
        provider: () => new Map(),

        // Suspense support
        suspense: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
