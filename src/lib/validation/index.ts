/**
 * SWITCHBOARD VALIDATION SCHEMAS
 * =============================================================================
 * Re-exports all validation schemas for easy importing.
 * =============================================================================
 */

// Client validation
export {
    createClientSchema,
    updateClientSchema,
    clientIdSchema,
    listClientsSchema,
    validateCreateClient,
    validateUpdateClient,
    safeValidateCreateClient,
    safeValidateUpdateClient,
    type CreateClientInput,
    type UpdateClientInput,
    type ClientIdInput,
    type ListClientsInput,
} from "./client";

// Agent validation
export {
    createAgentSchema,
    updateAgentSchema,
    agentIdSchema,
    listAgentsSchema,
    spendingLimitSchema,
    validateCreateAgent,
    validateUpdateAgent,
    safeValidateCreateAgent,
    safeValidateUpdateAgent,
    toAgentInsert,
    toAgentUpdate,
    type CreateAgentInput,
    type UpdateAgentInput,
    type AgentIdInput,
    type ListAgentsInput,
    type SpendingLimitInput,
} from "./agent";
