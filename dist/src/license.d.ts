import type { Tier } from './types.js';
export interface LicensePayload {
    tier: Tier;
    issued_at: string;
    expires_at: string;
    license_id: string;
}
export type LicenseValidationResult = {
    valid: true;
    payload: LicensePayload;
} | {
    valid: false;
    error: string;
};
export declare const PRODUCTION_PUBLIC_KEY_PEM = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAJzmf726WMU0NJXnqbJfOdY0HwwyNtWDjZGK+8JAogv8=\n-----END PUBLIC KEY-----";
/**
 * Canonical JSON serialization for signature verification.
 * Keys sorted alphabetically, no whitespace. Exported for test use.
 */
export declare function canonicalizePayload(payload: LicensePayload): string;
/**
 * Validate a license key offline using Ed25519 signature verification.
 *
 * @param key - Full license key string (e.g., "pcp_eyJ...")
 * @param publicKeyPem - Ed25519 public key PEM (defaults to PRODUCTION_PUBLIC_KEY_PEM).
 *                       Pass a test key for unit testing.
 * @returns Validation result with payload on success, error string on failure.
 */
export declare function validateLicenseKey(key: string, publicKeyPem?: string): LicenseValidationResult;
