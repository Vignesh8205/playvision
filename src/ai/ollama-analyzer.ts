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
    private readonly MODEL = 'phi3:mini'; // default model
    private initialized = false;
    private fallbackAnalyzer: OpenAIAnalyzer | null = null;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log(`Checking connection to Ollama (${this.OLLAMA_HOST}:${this.OLLAMA_PORT})...`);
        try {
            await this.checkOllamaStatus();
            console.log('✅ Ollama connection established');
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
        const errorMessage = error.message;
        const stackTrace = error.stack || '';
        const prompt = this.createPrompt(errorMessage, stackTrace);

        // Try Ollama first if initialized
        if (this.initialized) {
            try {
                const response = await this.queryOllama(prompt);
                return this.parseResponse(response, errorMessage);
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

        // Final fallback - return basic error info
        return {
            category: 'Unknown Error',
            confidence: 0,
            rootCause: errorMessage,
            suggestion: 'AI analysis failed. Check logs.',
        };
    }

    private createPrompt(errorMessage: string, stackTrace: string): string {
        const errorContext = stackTrace ? stackTrace.substring(0, 2000) : errorMessage.substring(0, 1000);

        return `You are a QA Automation expert. Analyze this Playwright/JavaScript error which occurred during test execution.
        
Error details:
${errorContext}

Respond ONLY with a valid JSON object in the following format. Do not use Markdown notation like \`\`\`json.
{
  "category": "one of [Selector Error, Timeout Error, Network Error, Assertion Error, Javascript Error]",
  "rootCause": "Detailed explanation of why this error occurred. Explain the specific mismatch or failure condition clearly.",
  "suggestion": "Step-by-step instructions on how to fix this. Provide 2-3 actionable bullets numbered 1, 2, 3.",
  "fixExample": "Complete code snippet showing the corrected approach. Include necessary imports or context."
}`;
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
                timeout: 60000 // 60 second timeout
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
                console.error('❌ Ollama request timeout (60s)');
                req.destroy();
                reject(new Error('Ollama request timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    private parseResponse(response: string, originalError: string): AIAnalysis {
        try {
            // Cleanup: sometimes models add markdown blocks or trailing chars
            let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();

            // Attempt to fix common JSON syntax errors if model output is messy
            // 1. If it ends with incomplete json, try to close it (basic heuristic)
            if (jsonStr.lastIndexOf('}') < jsonStr.lastIndexOf('"')) {
                jsonStr += '"}';
            }

            const result = JSON.parse(jsonStr);

            return {
                category: result.category || 'Unknown Error',
                confidence: 0.9, // Ollama doesn't return confidence easily, assume high if structured
                rootCause: result.rootCause || originalError,
                suggestion: result.suggestion || 'Check the error message manually.',
                fixExample: result.fixExample
            };
        } catch (e) {
            console.warn('⚠️ Failed to parse Ollama response as JSON. Raw response:', response);
            return {
                category: 'Unknown Error',
                confidence: 0.5,
                rootCause: originalError,
                suggestion: 'Could not parse AI advice. ' + response.substring(0, 100) + '...',
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
