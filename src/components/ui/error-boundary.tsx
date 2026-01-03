/**
 * Error Boundary Component
 * =============================================================================
 * Catches JavaScript errors anywhere in the component tree and displays
 * a fallback UI instead of crashing the entire application.
 * =============================================================================
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "./button";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: "page" | "component" | "section";
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate a unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    logger.error("React Error Boundary caught an error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      level: this.props.level || "component",
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      errorInfo,
    });
  }

  componentWillUnmount() {
    // Clean up any pending retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    logger.info("User retrying after error", { errorId: this.state.errorId });
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleReload = () => {
    logger.info("User reloading page after error", { errorId: this.state.errorId });
    window.location.reload();
  };

  handleGoHome = () => {
    logger.info("User navigating home after error", { errorId: this.state.errorId });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = "component" } = this.props;
      const { error, errorInfo, errorId } = this.state;

      // Different error UI based on level
      if (level === "page") {
        return (
          <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/5 border border-red-500/20 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-4">
                Something went wrong
              </h1>

              <p className="text-white/60 mb-6">
                We encountered an unexpected error. Our team has been notified and is working to fix this issue.
              </p>

              {errorId && (
                <div className="bg-black/30 rounded-lg p-3 mb-6">
                  <p className="text-xs text-white/40 mb-1">Error ID</p>
                  <p className="text-xs font-mono text-white/60">{errorId}</p>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleRetry} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>

              {this.props.showDetails && error && (
                <details className="mt-6 text-left">
                  <summary className="text-sm text-white/60 cursor-pointer hover:text-white/80">
                    Technical Details
                  </summary>
                  <div className="mt-3 p-3 bg-black/20 rounded text-xs font-mono text-red-300 overflow-auto max-h-32">
                    <p className="mb-2"><strong>Error:</strong> {error.message}</p>
                    {error.stack && (
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    )}
                    {errorInfo?.componentStack && (
                      <div className="mt-2">
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">{errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      }

      // Component/section level error
      return (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Bug className="w-4 h-4 text-red-500" />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-400 mb-2">
                Component Error
              </h3>

              <p className="text-sm text-white/60 mb-4">
                This {level} encountered an error and couldn&apos;t load properly.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={this.handleRetry}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Retry
                </Button>

                {errorId && (
                  <span className="text-xs text-white/40 self-center">
                    ID: {errorId}
                  </span>
                )}
              </div>
            </div>
          </div>

          {this.props.showDetails && error && (
            <details className="mt-4">
              <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                Details
              </summary>
              <div className="mt-2 p-2 bg-black/20 rounded text-xs font-mono text-red-300">
                {error.message}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for manual error reporting
 */
export function useErrorReporting() {
  return {
    reportError: (error: Error, context?: Record<string, unknown>) => {
      logger.error("Manual error report", {
        error: error.message,
        stack: error.stack,
        context,
      });
    },
  };
}
