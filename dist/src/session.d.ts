import type { Session, StorageInterface } from './types.js';
/** Create a new session, return it. */
export declare function createSession(storage: StorageInterface, partial: Omit<Session, 'id' | 'created_at' | 'last_accessed' | 'state' | 'answers'>): Promise<Session>;
/** Get a session by ID. Returns undefined if expired or not found. */
export declare function getSession(storage: StorageInterface, id: string): Promise<Session | undefined>;
/** Update a session in place. */
export declare function updateSession(storage: StorageInterface, id: string, updates: Partial<Session>): Promise<Session | undefined>;
