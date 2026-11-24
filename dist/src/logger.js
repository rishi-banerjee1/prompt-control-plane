// logger.ts — Structured logging with correlation IDs and prompt safety.
// stderr only (MCP protocol owns stdout).
import { randomUUID } from 'node:crypto';
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
// ENV controls (with legacy fallback for backward compatibility):
// PROMPT_CONTROL_PLANE_LOG_LEVEL = 'debug' | 'info' | 'warn' | 'error' (default: 'info')
// PROMPT_CONTROL_PLANE_LOG_PROMPTS = 'true' (default: unset/false — raw prompts NEVER logged)
const CURRENT_LEVEL = LOG_LEVELS[process.env.PROMPT_CONTROL_PLANE_LOG_LEVEL
    || process.env.PROMPT_OPTIMIZER_LOG_LEVEL // legacy fallback
    || 'info'] ?? LOG_LEVELS.info;
const LOG_PROMPTS = process.env.PROMPT_CONTROL_PLANE_LOG_PROMPTS === 'true'
    || process.env.PROMPT_OPTIMIZER_LOG_PROMPTS === 'true'; // legacy fallback
export function createRequestId() {
    return randomUUID();
}
function shouldLog(level) {
    return LOG_LEVELS[level] >= CURRENT_LEVEL;
}
function write(level, requestId, args) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    process.stderr.write(`[${level}] [${requestId}] ${msg}\n`);
}
export const log = {
    debug: (requestId, ...args) => {
        if (shouldLog('debug'))
            write('DEBUG', requestId, args);
    },
    info: (requestId, ...args) => {
        if (shouldLog('info'))
            write('INFO', requestId, args);
    },
    warn: (requestId, ...args) => {
        if (shouldLog('warn'))
            write('WARN', requestId, args);
    },
    error: (requestId, ...args) => {
        if (shouldLog('error'))
            write('ERROR', requestId, args);
    },
    // Special: prompt logging gated behind separate env var + debug level
    prompt: (requestId, label, content) => {
        if (LOG_PROMPTS && shouldLog('debug')) {
            const truncated = content.length > 500 ? content.slice(0, 500) + '...' : content;
            write('DEBUG', requestId, [`[PROMPT] ${label}: ${truncated}`]);
        }
    },
};
//# sourceMappingURL=logger.js.map