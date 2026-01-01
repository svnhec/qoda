/**
 * Signup Page
 * =============================================================================
 * User registration page with email/password form.
 * =============================================================================
 */

import { SignupForm } from "./signup-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  const supabase = await createClient();

  // If already authenticated, redirect to dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Create your account
        </h1>
        <p className="text-muted-foreground">
          Get started with Switchboard in minutes
        </p>
      </div>

      <SignupForm />
    </div>
  );
}




