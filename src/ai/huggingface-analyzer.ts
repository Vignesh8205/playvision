import { BaseAIAnalyzer } from './base-analyzer';
import { AIAnalysis } from '../schema/types';
import { RuleBasedAnalyzer } from './rule-based-analyzer';

/**
 * HuggingFace Transformers-based analyzer
 * Uses zero-shot classification for intelligent error categorization
 */
export class HuggingFaceAnalyzer extends BaseAIAnalyzer {
    private classifier: any = null;
    private initialized = false;
    private cache: Map<string, AIAnalysis> = new Map(); // Cache for analysis results
    private readonly RETRY_COUNT = 3;
    private readonly RETRY_DELAY_MS = 1000; // 1 second
    private readonly MODEL_DOWNLOAD_TIMEOUT_MS = 120000; // 2 minute timeout for model download

    // HuggingFace-specific error categories for zero-shot classification
    private readonly HF_CATEGORIES: string[] = [
        'Syntax Error',
        'Reference Error',
        'Type Error',
        'Network Error',
        'API Error',
        'Validation Error',
        'Authentication Error',
        'Authorization Error',
        'Database Error',
        'Configuration Error',
        'Resource Not Found',
        'Timeout Error',
        'Memory Error',
        'Concurrency Error',
        'Third-Party Integration Error',
        'Unknown Error'
    ];

    // Suggestions for HuggingFace-specific categories
    private readonly HF_SUGGESTIONS: Record<string, string> = {
        'Syntax Error': 'Check for typos, missing parentheses, brackets, or semicolons in your code. Use a linter or IDE to highlight syntax issues.',
        'Reference Error': 'Ensure all variables, functions, and objects are defined and in scope before being used. Check for correct spelling of identifiers.',
        'Type Error': 'Verify that variables and function arguments are of the expected data type. Use type checking (e.g., TypeScript) or runtime checks to prevent type mismatches.',
        'Network Error': 'Check your internet connection, firewall settings, and ensure the target server is reachable. Verify API endpoints and proxy configurations.',
        'API Error': 'Review the API documentation for the specific endpoint. Check request parameters, headers, and body. Look for status codes (e.g., 4xx, 5xx) and error messages from the API.',
        'Validation Error': "Examine the input data being sent to the function or API. Ensure it conforms to expected formats, types, and constraints (e.g., required fields, min/max lengths).",
        'Authentication Error': 'Verify user credentials (username, password, API key, token). Ensure the authentication token is valid, not expired, and correctly attached to the request.',
        'Authorization Error': 'Check if the authenticated user or service has the necessary permissions to perform the requested action or access the resource.',
        'Database Error': 'Inspect database connection strings, credentials, and ensure the database server is running and accessible. Review SQL queries for correctness and potential deadlocks.',
        'Configuration Error': 'Verify environment variables, configuration files, and application settings. Ensure all necessary parameters are set correctly and accessible.',
        'Resource Not Found': 'Confirm that the requested resource (e.g., file, URL, database record) actually exists at the specified path or identifier.',
        'Timeout Error': 'Increase the timeout duration for network requests or long-running operations. Optimize the performance of the operation to complete within the allowed time.',
        'Memory Error': 'Review code for potential memory leaks, large data structures, or inefficient resource usage. Consider optimizing algorithms or increasing available memory.',
        'Concurrency Error': 'Implement proper locking mechanisms, mutexes, or atomic operations when dealing with shared resources in a multi-threaded or asynchronous environment.',
        'Third-Party Integration Error': 'Consult the documentation for the integrated third-party service. Check their status page for outages and verify your API keys/configurations for that service.',
        'Unknown Error': 'This is an unexpected error. Review recent code changes, check logs for more details, and consider adding more specific error handling for this scenario.'
    };

    // Fix examples for HuggingFace-specific categories
    private readonly HF_FIX_EXAMPLES: Record<string, string> = {
        'Syntax Error': 'Example: `const x = 10;` instead of `const x = 10` (missing semicolon).',
        'Reference Error': 'Example: `console.log(myVar);` where `myVar` was not declared.',
        'Type Error': 'Example: `const num = "5"; console.log(num.toFixed(2));` (string instead of number).',
        'Network Error': 'Example: Check if `ping google.com` works. Verify proxy settings.',
        'API Error': 'Example: If API returns 400, check if request body matches schema.',
        'Validation Error': "Example: If a field `email` is required, ensure it's present in the input.",
        'Authentication Error': 'Example: Ensure `Authorization: Bearer <token>` header is correctly set.',
        'Authorization Error': "Example: User trying to delete a resource they don't own.",
        'Database Error': 'Example: Check if `DB_HOST` environment variable is correct.',
        'Configuration Error': 'Example: Missing `PORT` environment variable for server.',
        'Resource Not Found': 'Example: Requesting `/api/users/123` when user 123 does not exist.',
        'Timeout Error': 'Example: A database query taking too long to execute.',
        'Memory Error': 'Example: Loading an extremely large file into memory at once.',
        'Concurrency Error': 'Example: Two threads trying to update the same counter without a lock.',
        'Third-Party Integration Error': 'Example: Stripe API key is incorrect or expired.',
        'Unknown Error': 'Example: A generic `catch (e)` block without specific error handling.'
    };

    async initialize(): Promise<void> {
        if (this.initialized) return;
        try {
            console.log('🤖 Initializing HuggingFace AI Analyzer (downloading model if needed, up to 2 min)...');

            // Wrap initialization in a timeout to avoid blocking indefinitely
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
            console.log('✅ AI Analyzer ready');
        } catch (error) {
            console.warn('⚠️  HuggingFace initialization failed:', error);
            console.warn('⚠️  Falling back to rule-based analysis for this session.');
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
            console.log('⚡️ AI Analyzer: Cache hit for error message.');
            return this.cache.get(errorMessage)!;
        }

        let attempts = 0;

        // 2. Retry loop for classification
        while (attempts < this.RETRY_COUNT) {
            if (this.classifier && this.initialized) {
                try {
                    console.log(`🤖 AI Analyzer: Attempt ${attempts + 1} to classify error.`);
                    const result = await this.classifier(errorMessage, this.HF_CATEGORIES);
                    const category = result.labels[0];
                    const confidence = result.scores[0];
                    const alternatives = result.labels.map((lbl: string, idx: number) => ({
                        category: lbl,
                        confidence: result.scores[idx]
                    }));

                    const aiAnalysisResult: AIAnalysis = {
                        category,
                        confidence,
                        rootCause: this.extractRootCause(errorMessage, category),
                        suggestion: this.HF_SUGGESTIONS[category] || this.HF_SUGGESTIONS['Unknown Error'],
                        fixExample: this.HF_FIX_EXAMPLES[category],
                        alternatives
                    };

                    this.cache.set(errorMessage, aiAnalysisResult);
                    return aiAnalysisResult;
                } catch (err) {
                    console.warn(`⚠️  AI classification failed on attempt ${attempts + 1}:`, err);
                    attempts++;
                    if (attempts < this.RETRY_COUNT) {
                        console.log(`Retrying in ${this.RETRY_DELAY_MS}ms...`);
                        await new Promise(res => setTimeout(res, this.RETRY_DELAY_MS));
                    }
                }
            } else {
                console.warn('⚠️  AI Analyzer not initialized or classifier not available. Skipping AI classification.');
                break;
            }
        }

        // 3. Fallback to rule-based analyzer
        console.warn('⚠️  AI classification failed after retries, falling back to rule-based analysis.');
        const fallback = new RuleBasedAnalyzer();
        return await fallback.analyze(error);
    }
}
