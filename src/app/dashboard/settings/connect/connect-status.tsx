"use client";

/**
 * Connect Status Component
 * =============================================================================
 * Client component for Stripe Connect onboarding UI.
 * Handles button clicks and redirects to Stripe.
 * =============================================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Loader2,
  CreditCard,
  Building2,
  ShieldCheck
} from "lucide-react";

interface ConnectStatusProps {
  organizationId: string;
  organizationName: string;
  stripeAccountId: string | null;
  stripeAccountVerifiedAt: string | null;
  stripeAccountRequirementsDue: string[];
  isOwner: boolean;
  isAdmin: boolean;
  showSuccessToast: boolean;
  showReauthWarning: boolean;
}

export function ConnectStatus({
  organizationId,
  organizationName: _organizationName,
  stripeAccountId,
  stripeAccountVerifiedAt,
  stripeAccountRequirementsDue,
  isOwner,
  isAdmin: _isAdmin,
  showSuccessToast,
  showReauthWarning,
}: ConnectStatusProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(showSuccessToast);

  // Auto-hide success toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showToast]);

  const isVerified = !!stripeAccountVerifiedAt;
  const hasRequirements = stripeAccountRequirementsDue.length > 0;
  const hasStartedOnboarding = !!stripeAccountId;

  async function handleConnectClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/stripe/connect/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_id: organizationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe account");
      }

      // Redirect to Stripe onboarding
      if (data.accountLinkUrl) {
        window.location.href = data.accountLinkUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      setIsLoading(false);
    }
  }

  // Format requirement names for display
  function formatRequirement(requirement: string): string {
    return requirement
      .replace(/_/g, " ")
      .replace(/\./g, " › ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {showToast && (
        <Alert variant="success" className="animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Account Verified!</AlertTitle>
          <AlertDescription>
            Your Stripe account is now connected and ready to issue virtual cards.
          </AlertDescription>
        </Alert>
      )}

      {/* Reauth Warning */}
      {showReauthWarning && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Additional Information Required</AlertTitle>
          <AlertDescription>
            Stripe requires additional information to complete your account setup.
            Please click the button below to continue.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {isVerified ? (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
            ) : hasStartedOnboarding ? (
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <CardTitle className="text-xl">
                {isVerified
                  ? "Account Verified"
                  : hasStartedOnboarding
                  ? "Verification In Progress"
                  : "Complete Your Bank Setup"}
              </CardTitle>
              <CardDescription>
                {isVerified
                  ? "Your account is ready to issue virtual cards"
                  : hasStartedOnboarding
                  ? "Complete the remaining requirements to activate your account"
                  : "Connect to Stripe to enable virtual card issuing"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Verified State */}
          {isVerified && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <CheckCircle2 className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">
                  Your account is verified and ready to issue cards
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Verified on{" "}
                  {new Date(stripeAccountVerifiedAt!).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Requirements Due */}
          {hasRequirements && !isVerified && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Outstanding Requirements ({stripeAccountRequirementsDue.length})
              </p>
              <ul className="space-y-2">
                {stripeAccountRequirementsDue.map((req, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded bg-muted/50"
                  >
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    {formatRequirement(req)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Features List (for non-verified) */}
          {!isVerified && (
            <div className="grid gap-3">
              <p className="text-sm font-medium text-foreground">
                What you&apos;ll get:
              </p>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Issue virtual cards for your AI agents
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Real-time spend tracking and attribution
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4 text-primary" />
                  Automated rebilling to your clients
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {isOwner && !isVerified && (
            <Button
              onClick={handleConnectClick}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : hasStartedOnboarding ? (
                <>
                  Continue Setup
                  <ExternalLink className="w-4 h-4" />
                </>
              ) : (
                <>
                  Connect to Stripe
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </Button>
          )}

          {/* View Dashboard Button (verified) */}
          {isVerified && stripeAccountId && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  window.open(
                    `https://dashboard.stripe.com/${stripeAccountId}`,
                    "_blank"
                  )
                }
              >
                View Stripe Dashboard
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => (window.location.href = "/dashboard/agents")}
              >
                Create Your First Agent
                <CreditCard className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Non-owner message */}
          {!isOwner && !isVerified && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Owner Required</AlertTitle>
              <AlertDescription>
                Only the organization owner can set up Stripe Connect.
                Please contact your organization owner to complete this setup.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Account ID Display (for debugging/support) */}
      {stripeAccountId && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stripe Account ID</span>
              <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {stripeAccountId}
              </code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

