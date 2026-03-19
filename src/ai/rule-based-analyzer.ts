import { BaseAIAnalyzer } from './base-analyzer';
import { AIAnalysis } from '../schema/types';

/**
 * Rule-based error analyzer (no external dependencies)
 * Fast, offline, deterministic
 */
export class RuleBasedAnalyzer extends BaseAIAnalyzer {
    async analyze(error: Error): Promise<AIAnalysis> {
        return this.performHeuristicAnalysis(error);
    }
}
