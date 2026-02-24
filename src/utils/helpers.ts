/**
 * Utility functions for PlayVision Reporter
 */

/**
 * Sanitize filename for safe file system usage
 */
export function sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

/**
 * Generate unique test ID from test case
 */
export function generateTestId(suite: string, title: string): string {
    return `${suite}-${title}`.replace(/\s+/g, '-').toLowerCase();
}

/**
 * Get current timestamp
 */
export function getTimestamp(): number {
    return Date.now();
}
