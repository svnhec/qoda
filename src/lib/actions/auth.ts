"use server";

/**
 * Server Actions for Authentication
 * =============================================================================
 * Server actions for login and signup using Supabase Auth.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAuditError } from "@/lib/db/audit";

export type AuthActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

/**
 * Sign up a new user.
 */
export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string | null;
  const organizationName = formData.get("organization_name") as string | null;

  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters",
    };
  }

  // Check password strength
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasUppercase || !hasNumber) {
    return {
      success: false,
      error: "Password must contain at least one uppercase letter and one number",
    };
  }

  try {
    const supabase = await createClient();

    // Extract email prefix for defaults
    const emailPrefix = email.split("@")[0] || "user";

    // Sign up the user
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || emailPrefix,
          organization_name: organizationName || `${emailPrefix}'s Agency`,
          organization_slug: organizationName
            ? organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
            : emailPrefix.toLowerCase(),
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      },
    });

    if (error) {
      await logAuditError({
        action: "signup",
        resourceType: "user",
        error,
        metadata: { email },
      });

      return { success: false, error: error?.message || "Failed to sign up" };
    }

    // The trigger in 002_organizations.sql will auto-create:
    // - user_profile
    // - default organization
    // - org_membership with role='owner'

    return {
      success: true,
      message: "Account created! Please check your email to verify your account.",
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "signup",
      resourceType: "user",
      error,
      metadata: { email },
    });
    return { success: false, error: "Failed to create account" };
  }
}

/**
 * Sign in an existing user.
 */
export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirect") as string | null;

  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await logAuditError({
        action: "signin",
        resourceType: "user",
        error,
        metadata: { email },
      });
      return { success: false, error: error.message };
    }

    // Revalidate to refresh session
    revalidatePath("/", "layout");

    // Redirect to dashboard or specified redirect
    const redirectPath = redirectTo || "/dashboard";
    redirect(redirectPath);
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "signin",
      resourceType: "user",
      error,
      metadata: { email },
    });
    return { success: false, error: "Failed to sign in" };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      await logAuditError({
        action: "signout",
        resourceType: "user",
        error,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    redirect("/");
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "signout",
      resourceType: "user",
      error,
    });
    return { success: false, error: "Failed to sign out" };
  }
}

/**
 * Reset password for a user.
 */
export async function resetPassword(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get("email") as string;

  if (!email) {
    return { success: false, error: "Email is required" };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?type=recovery`,
    });

    if (error) {
      await logAuditError({
        action: "reset_password",
        resourceType: "user",
        error,
        metadata: { email },
      });
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: "If an account exists with this email, we've sent you a password reset link.",
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "reset_password",
      resourceType: "user",
      error,
      metadata: { email },
    });
    return { success: false, error: "Failed to send reset email" };
  }
}
