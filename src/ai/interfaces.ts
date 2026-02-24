import { AIAnalysis } from '../schema/types';

/**
 * Interface for AI error analysis
 */
export interface IAIAnalyzer {
    /**
     * Initialize the analyzer (load models, etc.)
     */
    initialize?(): Promise<void>;

    /**
     * Analyze an error and provide insights
     */
    analyze(error: Error): Promise<AIAnalysis>;

    /**
     * Check if analyzer is ready
     */
    isReady?(): boolean;
}

/**
 * AI Analyzer modes
 */
export enum AIMode {
    BASIC = 'basic',      // Rule-based analysis
    SMART = 'smart',      // HuggingFace transformers
    PREMIUM = 'premium'   // Ollama
}
