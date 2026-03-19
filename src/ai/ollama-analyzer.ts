import { BaseAIAnalyzer } from './base-analyzer';
import { AIAnalysis } from '../schema/types';
import * as http from 'http';
import { OpenAIAnalyzer } from './openai-analyzer';

/**
 * Ollama Analyzer with OpenAI Fallback
 * Uses local Ollama instance (e.g., phi3:mini) for error analysis
 * Falls back to OpenAI API if Ollama fails
 */
export class OllamaAnalyzer extends BaseAIAnalyzer {
    private readonly OLLAMA_HOST = 'localhost';
    private readonly OLLAMA_PORT = 11434;
    private readonly MODEL = 'llama3.2:1b'; // lightweight model
    private initialized = false;
    private fallbackAnalyzer: OpenAIAnalyzer | null = null;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log(`Checking connection to Ollama (${this.OLLAMA_HOST}:${this.OLLAMA_PORT}) with model ${this.MODEL}...`);
        try {
            await this.checkOllamaStatus();
            console.log(`✅ Ollama connection established with ${this.MODEL}`);
            this.initialized = true;
        } catch (error) {
            console.warn('⚠️  Could not connect to Ollama. Will use OpenAI API as fallback.');
            this.initialized = false;

            // Initialize OpenAI fallback
            console.log('🔄 Initializing OpenAI fallback...');
            this.fallbackAnalyzer = new OpenAIAnalyzer();
            await this.fallbackAnalyzer.initialize();
        }
    }

    isReady(): boolean {
        return this.initialized || (this.fallbackAnalyzer?.isReady() ?? false);
    }

    async analyze(error: Error): Promise<AIAnalysis> {
        const errorMessage = this.stripAnsi(error.message);
        const stackTrace = this.stripAnsi(error.stack || '');
        const prompt = this.createPrompt(errorMessage, stackTrace);

        // Try Ollama first if initialized
        if (this.initialized) {
            try {
                const response = await this.queryOllama(prompt);
                const analysis = this.parseResponse(response, errorMessage);
                
                // If parsing returned a generic "Unknown" or empty cause, use heuristics instead
                if (analysis.category === 'Unknown Error' || analysis.rootCause === 'AI returned an empty response.') {
                    console.log('💡 Ollama response was poor, falling back to heuristic analysis.');
                    return this.performHeuristicAnalysis(error);
                }
                
                return analysis;
            } catch (err) {
                console.error('❌ Ollama analysis failed:', err);
                console.log('🔄 Falling back to OpenAI API...');

                // Initialize fallback if not already done
                if (!this.fallbackAnalyzer) {
                    this.fallbackAnalyzer = new OpenAIAnalyzer();
                    await this.fallbackAnalyzer.initialize();
                }

                // Try OpenAI fallback
                if (this.fallbackAnalyzer && this.fallbackAnalyzer.isReady()) {
                    try {
                        return await this.fallbackAnalyzer.analyze(error);
                    } catch (fallbackErr) {
                        console.error('❌ OpenAI fallback also failed:', fallbackErr);
                    }
                }
            }
        } else if (this.fallbackAnalyzer && this.fallbackAnalyzer.isReady()) {
            // Use OpenAI directly if Ollama was never initialized
            return await this.fallbackAnalyzer.analyze(error);
        }

        // Final fallback - perform heuristic analysis instead of returning generic info
        console.log('💡 All specialized AI analyzers failed, performing heuristic analysis.');
        return this.performHeuristicAnalysis(error);
    }

    private createPrompt(errorMessage: string, stackTrace: string): string {
        const errorContext = stackTrace ? stackTrace.substring(0, 3000) : errorMessage.substring(0, 1500);

        return `You are a Senior Playwright Automation Expert. Your task is to perform a deep forensic analysis of a test failure.

### ERROR TO ANALYZE:
${errorContext}

### MANDATORY STEPS:
1. **Root Cause**: Explain exactly why the failure happened. Mention specific locators, URLs, or expected/actual values found in the log. Be thorough (2-3 sentences).
2. **Category**: Choose EXACTLY ONE from this list: [Locator Not Found, Timeout Error, Network Error, Assertion Failure, Visibility Issue, Navigation Error, Page Crash].
3. **Actionable Suggestions**: Provide a numbered list of 3 specific steps. Do NOT be generic. Tell the user exactly which line or component to check.
4. **Fix Example**: Write a 1-3 line Playwright code snippet that directly addresses the specific failure.

### RESPONSE FORMAT:
- Return ONLY a raw JSON object. 
- No commentary, no markdown code blocks, no backticks.
- Pick ONE category, do NOT return the whole list.
- Use "\\n" for newlines inside JSON string values.
- **CRITICAL**: Suggestion and Fix Example must be strings.
- **CRITICAL**: Use SINGLE QUOTES inside your strings to avoid breaking the JSON. 
  Example: "fixExample": "await page.locator('button').click();"
- **CRITICAL**: Do NOT use variables or concatenation outside of quotes.
  WRONG: "fixExample": "page.locator('" + var + "')"
  RIGHT: "fixExample": "page.locator('selector-here')"

### EXAMPLE OF GOOD JSON (Format only):
{
  "category": "Assertion Failure",
  "confidence": 0.98,
  "rootCause": "Detailed technical explanation of the specific failure found in the log.",
  "suggestion": "1. Concrete step 1\\n2. Concrete step 2\\n3. Concrete step 3",
  "fixExample": "await expect(page).toHaveTitle('Expected Title');"
}

### YOUR JSON:`;
    }

    private async queryOllama(prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                model: this.MODEL,
                prompt: prompt,
                stream: false
            });

            const options = {
                hostname: this.OLLAMA_HOST,
                port: this.OLLAMA_PORT,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 120000 // Increased to 120 seconds for phi3:mini
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const json = JSON.parse(data);
                            resolve(json.response);
                        } catch (e) {
                            console.error('❌ Invalid JSON from Ollama:', data.substring(0, 200));
                            reject(new Error('Invalid JSON from Ollama'));
                        }
                    } else {
                        console.error(`❌ Ollama API Error: ${res.statusCode}`);
                        reject(new Error(`Ollama API Error: ${res.statusCode} ${data}`));
                    }
                });
            });

            req.on('error', (e) => {
                console.error('❌ Ollama request error:', e.message);
                reject(e);
            });

            req.on('timeout', () => {
                console.error('❌ Ollama request timeout (120s)');
                req.destroy();
                reject(new Error('Ollama request timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    private parseResponse(response: string, originalError: string): AIAnalysis {
        try {
            const result = this.robustParseJSON(response);

            let suggestion = result.suggestion || 'Check the error message manually.';
            if (Array.isArray(suggestion)) {
                suggestion = suggestion.join('\n');
            }

            return {
                category: result.category || 'Unknown Error',
                confidence: result.confidence || 0.9,
                rootCause: result.rootCause || originalError,
                suggestion: suggestion,
                fixExample: result.fixExample,
                scriptImprovements: this.extractScriptImprovements(originalError, result.category || ''),
                flakinessAnalysis: this.analyzeFlakiness(originalError, result.category || ''),
                analyzedAt: Date.now(),
                model: `Ollama ${this.MODEL}`
            };
        } catch (e) {
            console.warn('⚠️ Failed to parse Ollama response. Raw response:', response);
            return {
                category: 'Unknown Error',
                confidence: 0.5,
                rootCause: originalError,
                suggestion: 'Could not parse AI advice. ' + response.substring(0, 100) + '...',
                analyzedAt: Date.now()
            };
        }
    }

    private checkOllamaStatus(): Promise<void> {
        return new Promise((resolve, reject) => {
            const req = http.get(`http://${this.OLLAMA_HOST}:${this.OLLAMA_PORT}/api/tags`, (res) => {
                if (res.statusCode === 200) resolve();
                else reject(new Error(`Status ${res.statusCode}`));
            });
            req.on('error', reject);
            req.end();
        });
    }
}
