/**
 * Login Page
 * =============================================================================
 * User sign-in page with email/password form.
 * =============================================================================
 */

import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // If already authenticated, redirect to dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(params.redirect || "/dashboard");
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to your Switchboard account
        </p>
      </div>

      <LoginForm redirectTo={params.redirect} />
    </div>
  );
}

