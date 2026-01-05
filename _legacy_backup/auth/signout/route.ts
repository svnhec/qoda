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
  } catch (error) {
    // Even if signout fails, we want to redirect to home
    console.error("Signout error:", error);
  }

  // Redirect to home page (or login page)
  return redirect("/auth/login");
}

