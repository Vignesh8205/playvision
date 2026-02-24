import { IAIAnalyzer, AIMode } from './interfaces';
import { HuggingFaceAnalyzer } from './huggingface-analyzer';
import { RuleBasedAnalyzer } from './rule-based-analyzer';
import { OllamaAnalyzer } from './ollama-analyzer';

/**
 * Factory for creating AI analyzers based on mode
 */
export class AIAnalyzerFactory {
    private static analyzers: Map<string, new () => IAIAnalyzer> = new Map();
    private static instances: Map<string, IAIAnalyzer> = new Map();

    /**
     * Register a new analyzer implementation
     */
    static register(mode: string, analyzer: new () => IAIAnalyzer): void {
        this.analyzers.set(mode, analyzer);
    }

    /**
     * Create an analyzer instance based on mode
     */
    static async create(mode: AIMode | string): Promise<IAIAnalyzer> {
        // Return cached instance if available
        if (this.instances.has(mode)) {
            return this.instances.get(mode)!;
        }

        let analyzer: IAIAnalyzer;

        // Try registered analyzers first
        const AnalyzerClass = this.analyzers.get(mode);
        if (AnalyzerClass) {
            analyzer = new AnalyzerClass();
        } else {
            // Default implementations
            switch (mode) {
                case AIMode.SMART:
                    analyzer = new HuggingFaceAnalyzer();
                    break;
                case AIMode.PREMIUM:
                    analyzer = new OllamaAnalyzer();
                    break;
                case AIMode.BASIC:
                default:
                    analyzer = new RuleBasedAnalyzer();
                    break;
            }
        }

        // Initialize and cache
        if (analyzer.initialize) {
            await analyzer.initialize();
        }

        this.instances.set(mode, analyzer);
        return analyzer;
    }
}
