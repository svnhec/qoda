/**
 * SWITCHBOARD ORGANIZATION UTILITIES
 * =============================================================================
 * Functions for managing organizations and memberships.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  Organization,
  OrganizationUpdate,
  OrganizationSummary,
  UserProfile,
  OrgMember,
  OrgRole,
  OrgMemberWithProfile,
} from "./types";

// Re-export types
export type {
  Organization,
  OrganizationSummary,
  UserProfile,
  OrgMember,
  OrgRole,
};

/**
 * Result of an organization operation.
 */
export type OrgResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// -----------------------------------------------------------------------------
// ORGANIZATION CRUD
// -----------------------------------------------------------------------------

/**
 * Get an organization by ID.
 * Uses RLS - only returns orgs the current user has access to.
 */
export async function getOrganization(
  orgId: string
): Promise<OrgResult<Organization>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Organization };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get an organization by slug.
 */
export async function getOrganizationBySlug(
  slug: string
): Promise<OrgResult<Organization>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Organization };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get organization summary with member counts.
 */
export async function getOrganizationSummary(
  orgId: string
): Promise<OrgResult<OrganizationSummary>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organization_summary")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OrganizationSummary };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get all organizations the current user belongs to.
 */
export async function getUserOrganizations(): Promise<
  OrgResult<OrganizationSummary[]>
> {
  try {
    const supabase = await createClient();

    // Get org IDs from membership
    const { data: memberships, error: memberError } = await supabase
      .from("org_members")
      .select("organization_id")
      .not("accepted_at", "is", null);

    if (memberError) {
      return { success: false, error: memberError.message };
    }

    const orgIds = memberships.map((m) => m.organization_id);

    if (orgIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get organization summaries
    const { data, error } = await supabase
      .from("organization_summary")
      .select("*")
      .in("id", orgIds);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OrganizationSummary[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Update an organization.
 * Requires admin role.
 */
export async function updateOrganization(
  orgId: string,
  updates: OrganizationUpdate
): Promise<OrgResult<Organization>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", orgId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Organization };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// USER PROFILE
// -----------------------------------------------------------------------------

/**
 * Get the current user's profile.
 */
export async function getCurrentUserProfile(): Promise<OrgResult<UserProfile>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as UserProfile };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Update the current user's profile.
 */
export async function updateUserProfile(
  updates: Partial<UserProfile>
): Promise<OrgResult<UserProfile>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as UserProfile };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// ORGANIZATION MEMBERS
// -----------------------------------------------------------------------------

/**
 * Get all members of an organization.
 */
export async function getOrgMembers(
  orgId: string
): Promise<OrgResult<OrgMemberWithProfile[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("org_members")
      .select(`
        *,
        user_profile:user_profiles(full_name, avatar_url)
      `)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OrgMemberWithProfile[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get the current user's role in an organization.
 */
export async function getCurrentUserRole(
  orgId: string
): Promise<OrgResult<OrgRole | null>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("org_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .not("accepted_at", "is", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - user is not a member
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data.role as OrgRole };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Invite a user to an organization.
 * Requires admin role.
 */
export async function inviteOrgMember(
  orgId: string,
  userId: string,
  role: OrgRole = "member"
): Promise<OrgResult<OrgMember>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("org_members")
      .insert({
        organization_id: orgId,
        user_id: userId,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OrgMember };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Accept an organization invitation.
 */
export async function acceptInvitation(
  orgId: string
): Promise<OrgResult<OrgMember>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("org_members")
      .update({ accepted_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .is("accepted_at", null)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OrgMember };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Update a member's role.
 * Requires admin role.
 */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  newRole: OrgRole
): Promise<OrgResult<OrgMember>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("org_members")
      .update({ role: newRole })
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OrgMember };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Remove a member from an organization.
 * Requires admin role (or self).
 */
export async function removeMember(
  orgId: string,
  userId: string
): Promise<OrgResult<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("org_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// STRIPE CONNECT HELPERS
// -----------------------------------------------------------------------------

/**
 * Update organization with Stripe account ID after Connect onboarding.
 * Uses service client to bypass RLS for webhook handlers.
 */
export async function linkStripeAccount(
  orgId: string,
  stripeAccountId: string
): Promise<OrgResult<Organization>> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("organizations")
      .update({
        stripe_account_id: stripeAccountId,
      })
      .eq("id", orgId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Organization };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Mark Stripe account as verified.
 * Uses service client for webhook handlers.
 */
export async function verifyStripeAccount(
  stripeAccountId: string
): Promise<OrgResult<Organization>> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("organizations")
      .update({
        stripe_account_verified_at: new Date().toISOString(),
        stripe_account_requirements_due: [],
      })
      .eq("stripe_account_id", stripeAccountId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Organization };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Update Stripe account requirements.
 * Uses service client for webhook handlers.
 */
export async function updateStripeRequirements(
  stripeAccountId: string,
  requirements: unknown[]
): Promise<OrgResult<Organization>> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("organizations")
      .update({
        stripe_account_requirements_due: requirements,
      })
      .eq("stripe_account_id", stripeAccountId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Organization };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

