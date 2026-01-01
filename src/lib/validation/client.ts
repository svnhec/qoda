/**
 * SWITCHBOARD CLIENT VALIDATION SCHEMAS
 * =============================================================================
 * Zod schemas for validating client input from external sources (forms, APIs).
 * 
 * These schemas:
 * - Validate required fields and formats
 * - Transform string inputs as needed
 * - Provide type-safe parsed outputs
 * =============================================================================
 */

import { z } from "zod";

// -----------------------------------------------------------------------------
// SHARED VALIDATORS
// -----------------------------------------------------------------------------

/**
 * Email validator - optional but must be valid format if provided.
 */
const optionalEmail = z
    .string()
    .email("Invalid email format")
    .nullish()
    .transform((val) => val || null);

/**
 * Phone validator - optional, basic format check.
 * Allows digits, spaces, dashes, parentheses, and + prefix.
 */
const optionalPhone = z
    .string()
    .regex(/^[+]?[\d\s\-().]+$/, "Invalid phone format")
    .min(7, "Phone number too short")
    .max(20, "Phone number too long")
    .nullish()
    .transform((val) => val?.trim() || null);

/**
 * Name validator - required, trimmed, reasonable length.
 */
const requiredName = z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .transform((val) => val.trim());

// -----------------------------------------------------------------------------
// CLIENT SCHEMAS
// -----------------------------------------------------------------------------

/**
 * Schema for creating a new client.
 */
export const createClientSchema = z.object({
    /** Client name (required) */
    name: requiredName,

    /** Contact email (optional, validated format) */
    contact_email: optionalEmail,

    /** Contact phone (optional, validated format) */
    contact_phone: optionalPhone,

    /** Additional metadata (optional) */
    metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

/**
 * Schema for updating an existing client.
 * All fields are optional.
 */
export const updateClientSchema = z.object({
    /** Client name */
    name: requiredName.optional(),

    /** Contact email */
    contact_email: optionalEmail,

    /** Contact phone */
    contact_phone: optionalPhone,

    /** Active status */
    is_active: z.boolean().optional(),

    /** Additional metadata */
    metadata: z.record(z.unknown()).optional(),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

/**
 * Schema for client ID parameter.
 */
export const clientIdSchema = z.object({
    clientId: z.string().uuid("Invalid client ID"),
});

export type ClientIdInput = z.infer<typeof clientIdSchema>;

/**
 * Schema for listing clients with optional filters.
 */
export const listClientsSchema = z.object({
    /** Filter by active status */
    is_active: z.coerce.boolean().optional(),

    /** Search by name (partial match) */
    search: z.string().max(100).optional(),

    /** Pagination: page number (1-based) */
    page: z.coerce.number().int().positive().optional().default(1),

    /** Pagination: items per page */
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListClientsInput = z.infer<typeof listClientsSchema>;

// -----------------------------------------------------------------------------
// VALIDATION HELPERS
// -----------------------------------------------------------------------------

/**
 * Validate and parse create client input.
 * @throws ZodError if validation fails
 */
export function validateCreateClient(input: unknown): CreateClientInput {
    return createClientSchema.parse(input);
}

/**
 * Validate and parse update client input.
 * @throws ZodError if validation fails
 */
export function validateUpdateClient(input: unknown): UpdateClientInput {
    return updateClientSchema.parse(input);
}

/**
 * Safe validation - returns result object instead of throwing.
 */
export function safeValidateCreateClient(input: unknown) {
    return createClientSchema.safeParse(input);
}

export function safeValidateUpdateClient(input: unknown) {
    return updateClientSchema.safeParse(input);
}
