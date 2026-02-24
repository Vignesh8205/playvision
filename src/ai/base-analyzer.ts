import { IAIAnalyzer } from './interfaces';
import { AIAnalysis } from '../schema/types';
import * as errorConfig from './error-config.json';

/**
 * Base analyzer with common functionality
 * Loads configuration from error-config.json
 */
export abstract class BaseAIAnalyzer implements IAIAnalyzer {
    protected ERROR_CATEGORIES: string[];
    protected SUGGESTIONS: Record<string, string>;
    protected FIX_EXAMPLES: Record<string, string>;
    protected PATTERNS: Record<string, RegExp>;

    constructor() {
        // Load configuration from JSON
        const config = errorConfig;

        this.ERROR_CATEGORIES = config.categories;
        this.SUGGESTIONS = config.suggestions;
        this.FIX_EXAMPLES = config.fixExamples;

        // Convert string patterns to RegExp
        this.PATTERNS = {};
        for (const [category, pattern] of Object.entries(config.patterns)) {
            this.PATTERNS[category] = new RegExp(pattern as string, 'i');
        }
    }

    abstract analyze(error: Error): Promise<AIAnalysis>;

    protected extractRootCause(errorMessage: string, category: string): string {
        // Extract selector from locator errors
        const selectorMatch = errorMessage.match(/selector\s+["']([^"']+)["']/i);
        if (selectorMatch && category === 'Locator Not Found') {
            return `Selector "${selectorMatch[1]}" could not be found in the DOM`;
        }

        // Extract timeout duration
        const timeoutMatch = errorMessage.match(/timeout of (\d+)ms/i);
        if (timeoutMatch && category === 'Timeout Error') {
            return `Operation exceeded timeout of ${timeoutMatch[1]}ms`;
        }

        return errorMessage.split('\n')[0]; // First line as root cause
    }

    protected getFixExample(category: string): string | undefined {
        return this.FIX_EXAMPLES[category];
    }

    protected getPatterns(): Record<string, RegExp> {
        return this.PATTERNS;
    }
}
