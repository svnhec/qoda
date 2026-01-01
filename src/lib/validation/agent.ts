/**
 * SWITCHBOARD AGENT VALIDATION SCHEMAS
 * =============================================================================
 * Zod schemas for validating agent input from external sources (forms, APIs).
 * 
 * These schemas:
 * - Validate required fields and formats
 * - Accept money inputs as dollar strings and convert to cents (BigInt)
 * - Provide type-safe parsed outputs
 * =============================================================================
 */

import { z } from "zod";
import { dollarsToCents, type CentsAmount } from "@/lib/types/currency";

// -----------------------------------------------------------------------------
// MONEY VALIDATORS
// -----------------------------------------------------------------------------

/**
 * Dollar amount validator.
 * Accepts string or number, parses as dollars, converts to cents (BigInt).
 * 
 * @example
 * "100.00" → 10000n
 * "0" → 0n
 * 150.50 → 15050n
 */
const dollarsToCentsSchema = z
    .union([z.string(), z.number()])
    .refine(
        (val) => {
            const num = typeof val === "string" ? parseFloat(val) : val;
            return !isNaN(num) && isFinite(num) && num >= 0;
        },
        { message: "Must be a valid non-negative dollar amount" }
    )
    .transform((val): CentsAmount => dollarsToCents(val));

/**
 * Optional dollar amount schema.
 */
const optionalDollarsToCentsSchema = z
    .union([z.string(), z.number()])
    .refine(
        (val) => {
            if (val === "" || val === null || val === undefined) return true;
            const num = typeof val === "string" ? parseFloat(val) : val;
            return !isNaN(num) && isFinite(num) && num >= 0;
        },
        { message: "Must be a valid non-negative dollar amount" }
    )
    .optional()
    .transform((val): CentsAmount | undefined => {
        if (val === "" || val === null || val === undefined) return undefined;
        return dollarsToCents(val);
    });

// -----------------------------------------------------------------------------
// SHARED VALIDATORS
// -----------------------------------------------------------------------------

/**
 * Name validator - required, trimmed, reasonable length.
 */
const requiredName = z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .transform((val) => val.trim());

/**
 * Description validator - optional, trimmed.
 */
const optionalDescription = z
    .string()
    .max(2000, "Description too long")
    .nullish()
    .transform((val) => val?.trim() || null);

/**
 * UUID validator.
 */
const uuidSchema = z.string().uuid();

// -----------------------------------------------------------------------------
// AGENT SCHEMAS
// -----------------------------------------------------------------------------

/**
 * Schema for creating a new agent.
 * Money fields accept dollar amounts (string or number) and convert to cents.
 */
export const createAgentSchema = z.object({
    /** Agent name (required) */
    name: requiredName,

    /** Description (optional) */
    description: optionalDescription,

    /** Client ID - if the agent is associated with a client */
    client_id: uuidSchema.nullish().transform((val) => val || null),

    /** 
     * Monthly budget in dollars.
     * Accepts string like "100.00" or number like 100.00
     * Converts to cents (BigInt) internally.
     * Defaults to 0 if not provided.
     */
    monthly_budget_dollars: z
        .union([z.string(), z.number()])
        .refine(
            (val) => {
                const num = typeof val === "string" ? parseFloat(val) : val;
                return !isNaN(num) && isFinite(num) && num >= 0;
            },
            { message: "Must be a valid non-negative dollar amount" }
        )
        .optional()
        .transform((val): CentsAmount => {
            if (val === undefined || val === null || val === "") return 0n;
            return dollarsToCents(val);
        }),

    /** Reset date for monthly budget (ISO date string) */
    reset_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format")
        .optional(),

    /** Additional metadata (optional) */
    metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

/**
 * Schema for updating an existing agent.
 * All fields are optional. Money fields accept dollars and convert to cents.
 */
export const updateAgentSchema = z.object({
    /** Agent name */
    name: requiredName.optional(),

    /** Description */
    description: optionalDescription,

    /** Client ID */
    client_id: uuidSchema.nullish().transform((val) => val || null),

    /** Monthly budget in dollars (converts to cents) */
    monthly_budget_dollars: optionalDollarsToCentsSchema,

    /** Reset date (ISO date string YYYY-MM-DD) */
    reset_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format")
        .optional(),

    /** Active status */
    is_active: z.boolean().optional(),

    /** Additional metadata */
    metadata: z.record(z.unknown()).optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

/**
 * Schema for agent ID parameter.
 */
export const agentIdSchema = z.object({
    agentId: z.string().uuid("Invalid agent ID"),
});

export type AgentIdInput = z.infer<typeof agentIdSchema>;

/**
 * Schema for listing agents with optional filters.
 */
export const listAgentsSchema = z.object({
    /** Filter by client ID */
    client_id: uuidSchema.optional(),

    /** Filter by active status */
    is_active: z.coerce.boolean().optional(),

    /** Search by name (partial match) */
    search: z.string().max(100).optional(),

    /** Pagination: page number (1-based) */
    page: z.coerce.number().int().positive().optional().default(1),

    /** Pagination: items per page */
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListAgentsInput = z.infer<typeof listAgentsSchema>;

/**
 * Schema for spending limit updates (e.g., when issuing cards).
 * Accepts dollars, converts to cents.
 */
export const spendingLimitSchema = z.object({
    /** Spending limit in dollars */
    spending_limit_dollars: dollarsToCentsSchema,
});

export type SpendingLimitInput = z.infer<typeof spendingLimitSchema>;

// -----------------------------------------------------------------------------
// VALIDATION HELPERS
// -----------------------------------------------------------------------------

/**
 * Validate and parse create agent input.
 * @throws ZodError if validation fails
 */
export function validateCreateAgent(input: unknown): CreateAgentInput {
    return createAgentSchema.parse(input);
}

/**
 * Validate and parse update agent input.
 * @throws ZodError if validation fails
 */
export function validateUpdateAgent(input: unknown): UpdateAgentInput {
    return updateAgentSchema.parse(input);
}

/**
 * Safe validation - returns result object instead of throwing.
 */
export function safeValidateCreateAgent(input: unknown) {
    return createAgentSchema.safeParse(input);
}

export function safeValidateUpdateAgent(input: unknown) {
    return updateAgentSchema.safeParse(input);
}

// -----------------------------------------------------------------------------
// CONVERSION HELPERS
// -----------------------------------------------------------------------------

/**
 * Convert validated CreateAgentInput to database insert format.
 * Maps monthly_budget_dollars to monthly_budget_cents.
 */
export function toAgentInsert(input: CreateAgentInput) {
    return {
        name: input.name,
        description: input.description,
        client_id: input.client_id,
        monthly_budget_cents: input.monthly_budget_dollars,
        reset_date: input.reset_date,
        metadata: input.metadata,
    };
}

/**
 * Convert validated UpdateAgentInput to database update format.
 * Maps monthly_budget_dollars to monthly_budget_cents.
 */
export function toAgentUpdate(input: UpdateAgentInput) {
    const update: Record<string, unknown> = {};

    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.client_id !== undefined) update.client_id = input.client_id;
    if (input.monthly_budget_dollars !== undefined) {
        update.monthly_budget_cents = input.monthly_budget_dollars;
    }
    if (input.reset_date !== undefined) update.reset_date = input.reset_date;
    if (input.is_active !== undefined) update.is_active = input.is_active;
    if (input.metadata !== undefined) update.metadata = input.metadata;

    return update;
}
