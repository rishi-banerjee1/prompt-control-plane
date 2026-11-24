import type { StorageInterface, OptimizerConfig, UsageData, StatsData, EnforcementResult, ExecutionContext, StatsEvent, Session, LicenseData } from './interface.js';
export declare class LocalFsStorage implements StorageInterface {
    private readonly dataDir;
    private readonly sessionsDir;
    private readonly usageFile;
    private readonly configFile;
    private readonly statsFile;
    private readonly licenseFile;
    constructor(dataDir?: string);
    private _ensureDataDir;
    private _isInsideDataDir;
    private _readJsonFile;
    private _safeWriteJson;
    /**
     * Advisory file lock using lockfile (O_CREAT|O_EXCL — atomic creation).
     * Fail-open: if the lock cannot be acquired after retries, logs a warning
     * and executes `fn` anyway to avoid blocking the tool.
     */
    private _withLock;
    health(): Promise<'ok' | 'degraded'>;
    getUsage(): Promise<UsageData>;
    incrementUsage(): Promise<UsageData>;
    /**
     * Resolve the current monthly period usage, resetting the counter if the
     * calendar month has changed since the last recorded period start.
     */
    private _resolveMonthlyUsage;
    canUseOptimization(ctx: ExecutionContext): Promise<EnforcementResult>;
    isProTier(): Promise<boolean>;
    getConfig(): Promise<OptimizerConfig>;
    setConfig(updates: Partial<OptimizerConfig>): Promise<OptimizerConfig>;
    saveSession(session: Session): Promise<void>;
    loadSession(id: string): Promise<Session | undefined>;
    deleteSession(id: string): Promise<void>;
    cleanupSessions(): Promise<void>;
    private _cleanupSessionsSync;
    getStats(): Promise<StatsData>;
    updateStats(event: StatsEvent): Promise<void>;
    getLicense(): Promise<LicenseData | null>;
    setLicense(data: LicenseData): Promise<void>;
    clearLicense(): Promise<void>;
}
