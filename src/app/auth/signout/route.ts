/**
 * POST /auth/signout
 * =============================================================================
 * Sign out route handler.
 * Clears the Supabase session and redirects to home.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function POST() {
  try {
    const supabase = await createClient();

    // Sign out
    await supabase.auth.signOut();

    // Redirect to home page
    redirect("/");
  } catch (error) {
    // Even if signout fails, redirect to home
    console.error("Signout error:", error);
    redirect("/");
  }
}

