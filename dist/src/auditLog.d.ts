import type { AuditEntry } from './types.js';
/** Well-known genesis hash — first entry chains from this. */
export declare const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export declare class AuditLogger {
    private readonly dataDir;
    private lastHash;
    constructor(dataDir?: string);
    /**
     * Append an audit entry as a JSONL line with integrity hash chaining.
     * No-throw: all errors swallowed (audit never breaks pipeline).
     * Enforces: max 10 detail keys, no raw_prompt/compiled_prompt keys.
     * Chain: integrity_hash = SHA-256(prev_hash + JSON(entry_without_hash))
     */
    append(entry: AuditEntry): Promise<void>;
    /**
     * Get the integrity_hash of the last audit entry (for chaining).
     * Returns GENESIS_HASH if no entries exist.
     */
    private getLastHash;
    /**
     * Read all audit entries. For testing only — not exposed via MCP.
     */
    readAll(): Promise<AuditEntry[]>;
    /**
     * Verify the integrity of the audit chain.
     * Returns { valid: true, entries } or { valid: false, broken_at_index, entries }.
     */
    verifyChain(): Promise<{
        valid: boolean;
        broken_at_index?: number;
        entry_count: number;
    }>;
}
export declare const auditLogger: AuditLogger;
