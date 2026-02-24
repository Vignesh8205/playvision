import { BaseAIAnalyzer } from './base-analyzer';
import { AIAnalysis } from '../schema/types';

/**
 * Rule-based error analyzer (no external dependencies)
 * Fast, offline, deterministic
 */
export class RuleBasedAnalyzer extends BaseAIAnalyzer {
    async analyze(error: Error): Promise<AIAnalysis> {
        const errorMessage = error.message || error.toString();

        // Use patterns from configuration
        const patterns = this.getPatterns();

        for (const [category, pattern] of Object.entries(patterns)) {
            if (pattern.test(errorMessage)) {
                return {
                    category,
                    confidence: 0.9,
                    rootCause: this.extractRootCause(errorMessage, category),
                    suggestion: this.SUGGESTIONS[category],
                    fixExample: this.getFixExample(category)
                };
            }
        }

        return {
            category: 'Unknown Error',
            confidence: 0.5,
            rootCause: 'Unable to classify error automatically',
            suggestion: this.SUGGESTIONS['Unknown Error']
        };
    }
}
