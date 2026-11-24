import type { Session, SessionExport, SessionListResponse, PurgeResult } from './types.js';
export declare class SessionHistoryManager {
    private readonly dataDir;
    constructor(dataDir?: string);
    /**
     * Save session to disk: ~/.prompt-control-plane/session-{id}.json
     * No throwing — returns success status.
     */
    saveSession(session: Session): Promise<boolean>;
    /**
     * Load session by ID: ~/.prompt-control-plane/session-{id}.json
     */
    loadSession(sessionId: string): Promise<Session | null>;
    /**
     * List all sessions (metadata only, no raw prompts).
     * Sorted newest-first.
     * Limited to max 100.
     */
    listSessions(filter?: {
        createdAfter?: number;
        createdBefore?: number;
        limit?: number;
    }): Promise<SessionListResponse>;
    /**
     * Export full session details (including raw prompt).
     * Returns null if not found.
     */
    exportSession(sessionId: string, options?: {
        engine_version?: string;
        policy_mode?: string;
        policy_hash?: string;
    }): Promise<SessionExport | null>;
    /**
     * Purge sessions by policy. Two-step safe: mode must be explicit.
     * Only deletes session-*.json files — never touches audit.log, config, license, usage.
     * deleted_session_ids capped at 100, always sorted lexicographic.
     */
    purgeByPolicy(options: {
        mode: 'all' | 'by_policy';
        older_than_days?: number;
        keep_last?: number;
        dry_run?: boolean;
    }): Promise<PurgeResult>;
    /**
     * Delete a session file.
     * Returns success status.
     */
    deleteSession(sessionId: string): Promise<boolean>;
}
export declare const sessionHistory: SessionHistoryManager;
