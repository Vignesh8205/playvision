import { BaseAIAnalyzer } from './base-analyzer';
import { AIAnalysis } from '../schema/types';

/**
 * HuggingFace Transformers-based analyzer
 * Uses zero-shot classification for intelligent error categorization
 */
export class HuggingFaceAnalyzer extends BaseAIAnalyzer {
    private classifier: any = null;
    private initialized = false;
    private cache: Map<string, AIAnalysis> = new Map();
    private readonly RETRY_COUNT = 3;
    private readonly RETRY_DELAY_MS = 1000;
    private readonly MODEL_DOWNLOAD_TIMEOUT_MS = 120000; // 2 minute timeout

    async initialize(): Promise<void> {
        if (this.initialized) return;
        try {
            console.log('🤖 Initializing HuggingFace AI Analyzer (Xenova/distilbert-base-uncased-mnli)...');

            const initPromise = (async () => {
                const { pipeline } = await import('@huggingface/transformers');
                this.classifier = await pipeline(
                    'zero-shot-classification',
                    'Xenova/distilbert-base-uncased-mnli'
                );
            })();

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Model download timed out after ${this.MODEL_DOWNLOAD_TIMEOUT_MS / 1000}s`)), this.MODEL_DOWNLOAD_TIMEOUT_MS)
            );

            await Promise.race([initPromise, timeoutPromise]);
            this.initialized = true;
            console.log('✅ HuggingFace AI Analyzer ready');
        } catch (error) {
            console.warn('⚠️  HuggingFace initialization failed:', error);
            console.warn('⚠️  Falling back to heuristic analysis for this session.');
            this.initialized = false;
        }
    }

    isReady(): boolean {
        return this.initialized;
    }

    async analyze(error: Error): Promise<AIAnalysis> {
        const errorMessage = error.message || error.toString();

        // 1. Cache check
        if (this.cache.has(errorMessage)) {
            return this.cache.get(errorMessage)!;
        }

        // 2. Try AI Classification if initialized
        if (this.initialized && this.classifier) {
            let attempts = 0;
            const CONFIDENCE_THRESHOLD = 0.4;
            
            // Map descriptive labels back to system categories
            const labelMap: Record<string, string> = {
                'Element or Locator Not Found': 'Locator Not Found',
                'Timeout Exceeded': 'Timeout Error',
                'Test Assertion Failed (expect, match, should)': 'Assertion Failure',
                'Network or Connection Error': 'Network Error',
                'Element Not Visible or Obscured': 'Visibility Issue',
                'Page Navigation Failed': 'Navigation Error',
                'Browser Page or Worker Crashed': 'Page Crash',
                'Other or Unknown Error': 'Unknown Error'
            };
            const descriptiveLabels = Object.keys(labelMap);

            while (attempts < this.RETRY_COUNT) {
                try {
                    console.log(`🤖 AI Analyzer: Classifying error (Attempt ${attempts + 1})...`);
                    
                    const result = await this.classifier(errorMessage, descriptiveLabels);
                    const bestLabel = result.labels[0];
                    const confidence = result.scores[0];
                    const category = labelMap[bestLabel] || 'Unknown Error';
                    
                    // If confidence is too low, don't trust it and use heuristic fallback
                    if (confidence < CONFIDENCE_THRESHOLD) {
                        console.warn(`⚠️  Low AI confidence (${confidence.toFixed(2)}), falling back to heuristic.`);
                        break; 
                    }

                    const alternatives = result.labels.slice(1, 4).map((lbl: string, idx: number) => ({
                        category: labelMap[lbl] || lbl,
                        confidence: result.scores[idx + 1]
                    }));

                    const aiAnalysisResult: AIAnalysis = {
                        category,
                        confidence,
                        rootCause: this.extractRootCause(errorMessage, category),
                        suggestion: this.SUGGESTIONS[category] || this.SUGGESTIONS['Unknown Error'],
                        fixExample: this.getFixExample(category),
                        alternatives,
                        scriptImprovements: this.extractScriptImprovements(errorMessage, category),
                        flakinessAnalysis: this.analyzeFlakiness(errorMessage, category),
                        analyzedAt: Date.now(),
                        model: 'HuggingFace Xenova/distilbert-base-uncased-mnli (Zero-Shot)'
                    };

                    this.cache.set(errorMessage, aiAnalysisResult);
                    return aiAnalysisResult;
                } catch (err) {
                    console.warn(`⚠️  AI classification attempt ${attempts + 1} failed:`, err);
                    attempts++;
                    if (attempts < this.RETRY_COUNT) {
                        await new Promise(res => setTimeout(res, this.RETRY_DELAY_MS));
                    }
                }
            }
        }

        // 3. Fallback to heuristic analysis (inherited from BaseAIAnalyzer)
        console.warn('⚠️  Using heuristic pattern matching fallback.');
        const fallbackResult = this.performHeuristicAnalysis(error);
        this.cache.set(errorMessage, fallbackResult);
        return fallbackResult;
    }
}
