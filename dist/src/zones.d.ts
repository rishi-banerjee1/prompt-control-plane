/**
 * Zone type identifies structured regions in text that should not be altered.
 * Heuristics must skip zones or be explicitly marked as zone-aware.
 */
export interface Zone {
    startLine: number;
    endLine: number;
    type: 'fenced_code' | 'markdown_table' | 'markdown_list' | 'json_block' | 'yaml_block';
}
/**
 * Scan text for structured zones (fenced code blocks, tables, lists, etc.).
 * Used to protect content from over-aggressive heuristics.
 *
 * Conservative matching: prefers under-matching to over-matching.
 * For example, a single `|` line is not a table; need >=2 consecutive lines.
 *
 * @param text Input text (or lines to scan)
 * @returns Array of Zone objects (sorted by startLine)
 */
export declare function scanZones(text: string): Zone[];
/**
 * Internal: scan zones from pre-split lines array.
 * @param lines Array of strings (one line per element)
 * @returns Zone array
 */
export declare function scanZonesByLines(lines: string[]): Zone[];
/**
 * Check if a line number is inside any zone.
 * @param lineNum 0-indexed line number
 * @param zones Array of zones
 * @returns true if line is in a zone
 */
export declare function isLineInZone(lineNum: number, zones: Zone[]): boolean;
/**
 * Re-export for convenience in heuristics.
 * This is a wrapper that accepts a line number and set.
 */
export declare function isLinePreserved(lineNum: number, preserved: Set<number>): boolean;
/**
 * Get all zones covering a range of lines.
 * @param startLine 0-indexed
 * @param endLine 0-indexed (inclusive)
 * @param zones Zone array
 * @returns Subset of zones that overlap with range
 */
export declare function getZonesInRange(startLine: number, endLine: number, zones: Zone[]): Zone[];
