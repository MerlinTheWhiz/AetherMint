/**
 * Conflict resolution for sync
 * Handles divergent changes from multiple devices using configurable strategies
 */

import logger from '../utils/logger';

export type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'server-wins' | 'client-wins' | 'merge';

export interface ConflictInput {
  entityType: string;
  entityId: string;
  serverVersion: number;
  serverUpdatedAt: Date;
  serverPayload: Record<string, unknown>;
  clientVersion: number;
  clientUpdatedAt: Date;
  clientPayload: Record<string, unknown>;
  deviceId: string;
}

export interface ConflictResult {
  resolved: boolean;
  payload: Record<string, unknown>;
  strategy: ConflictStrategy;
  conflictDetected: boolean;
  winningSource: 'server' | 'client' | 'merged';
  message?: string;
}

/**
 * Detect if there is a real conflict (same entity, different versions, both modified).
 */
export function hasConflict(input: ConflictInput): boolean {
  if (input.serverVersion === input.clientVersion) {
    return false;
  }
  // Conflict when client has different version than server (concurrent edits)
  return input.clientVersion !== input.serverVersion;
}

/**
 * Resolve conflict using the given strategy.
 * GIVEN conflict, WHEN detected, THEN resolution algorithm handles it.
 */
export function resolveConflict(input: ConflictInput, strategy: ConflictStrategy): ConflictResult {
  const conflictDetected = hasConflict(input);

  if (!conflictDetected) {
    return {
      resolved: true,
      payload: input.clientPayload,
      strategy,
      conflictDetected: false,
      winningSource: 'client',
      message: 'No conflict; accepting client state'
    };
  }

  switch (strategy) {
    case 'last-write-wins': {
      const serverTime = new Date(input.serverUpdatedAt).getTime();
      const clientTime = new Date(input.clientUpdatedAt).getTime();
      const useClient = clientTime >= serverTime;
      return {
        resolved: true,
        payload: useClient ? input.clientPayload : input.serverPayload,
        strategy: 'last-write-wins',
        conflictDetected: true,
        winningSource: useClient ? 'client' : 'server',
        message: useClient ? 'Client has newer timestamp' : 'Server has newer timestamp'
      };
    }

    case 'first-write-wins': {
      const serverTime = new Date(input.serverUpdatedAt).getTime();
      const clientTime = new Date(input.clientUpdatedAt).getTime();
      const useServer = serverTime <= clientTime;
      return {
        resolved: true,
        payload: useServer ? input.serverPayload : input.clientPayload,
        strategy: 'first-write-wins',
        conflictDetected: true,
        winningSource: useServer ? 'server' : 'client'
      };
    }

    case 'server-wins':
      return {
        resolved: true,
        payload: input.serverPayload,
        strategy: 'server-wins',
        conflictDetected: true,
        winningSource: 'server',
        message: 'Server state retained'
      };

    case 'client-wins':
      return {
        resolved: true,
        payload: input.clientPayload,
        strategy: 'client-wins',
        conflictDetected: true,
        winningSource: 'client',
        message: 'Client state accepted'
      };

    case 'merge': {
      const merged = mergePayloads(input.serverPayload, input.clientPayload);
      return {
        resolved: true,
        payload: merged,
        strategy: 'merge',
        conflictDetected: true,
        winningSource: 'merged',
        message: 'Merged server and client changes'
      };
    }

    default:
      logger.warn(`Unknown conflict strategy: ${strategy}, defaulting to last-write-wins`);
      return resolveConflict(input, 'last-write-wins');
  }
}

/**
 * Shallow merge: for each key, prefer the value from the payload with the later timestamp.
 * For nested objects we do one level: if both have same key as object, merge those recursively once.
 */
function mergePayloads(
  server: Record<string, unknown>,
  client: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...server };

  for (const key of Object.keys(client)) {
    const serverVal = server[key];
    const clientVal = client[key];

    if (serverVal === undefined && clientVal !== undefined) {
      result[key] = clientVal;
    } else if (serverVal !== undefined && clientVal === undefined) {
      result[key] = serverVal;
    } else if (
      serverVal !== null &&
      typeof serverVal === 'object' &&
      !Array.isArray(serverVal) &&
      clientVal !== null &&
      typeof clientVal === 'object' &&
      !Array.isArray(clientVal)
    ) {
      result[key] = mergePayloads(
        serverVal as Record<string, unknown>,
        clientVal as Record<string, unknown>
      );
    } else {
      result[key] = clientVal;
    }
  }

  return result;
}

/**
 * Get default strategy per entity type (can be overridden by config).
 */
export function getDefaultStrategy(entityType: string): ConflictStrategy {
  const strategyMap: Record<string, ConflictStrategy> = {
    progress: 'last-write-wins',
    preferences: 'merge',
    course_state: 'last-write-wins',
    notes: 'merge',
    generic: 'last-write-wins'
  };
  return strategyMap[entityType] ?? 'last-write-wins';
}
