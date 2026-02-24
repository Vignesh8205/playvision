import { BaseAIAnalyzer } from './base-analyzer';
import { AIAnalysis } from '../schema/types';
import * as https from 'https';

/**
 * OpenAI-Compatible API Analyzer
 * Uses OpenAI-compatible API (apifree.ai) for error analysis
 * Configuration is loaded from environment variables
 */
export class OpenAIAnalyzer extends BaseAIAnalyzer {
    private readonly API_URL: string;
    private readonly API_PATH = '/v1/chat/completions';
    private readonly MODEL: string;
    private readonly API_KEY: string;
    private initialized = false;

    constructor() {
        super();

        // Load from environment variables with fallback to defaults
        const apiUrl = process.env.OPENAI_API_URL || 'https://api.apifree.ai/v1/chat/completions';
        const urlParts = new URL(apiUrl);

        this.API_URL = urlParts.hostname;
        this.MODEL = process.env.OPENAI_MODEL || 'openai/gpt-5.2';
        this.API_KEY = process.env.OPENAI_API_KEY || '';

        if (!this.API_KEY) {
            console.warn('⚠️  OPENAI_API_KEY not found in environment variables. OpenAI analyzer may not work.');
        }
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('🔌 Initializing OpenAI-compatible API analyzer...');
        try {
            // Test the API connection with a simple request
            await this.testConnection();
            console.log('✅ OpenAI API connection established');
            this.initialized = true;
        } catch (error) {
            console.warn('⚠️  Could not connect to OpenAI API:', error);
            this.initialized = false;
        }
    }

    isReady(): boolean {
        return this.initialized;
    }

    async analyze(error: Error): Promise<AIAnalysis> {
        if (!this.initialized) {
            throw new Error('OpenAI Analyzer not initialized');
        }

        const errorMessage = error.message;
        const stackTrace = error.stack || '';
        const prompt = this.createPrompt(errorMessage, stackTrace);

        try {
            const response = await this.queryOpenAI(prompt);
            return this.parseResponse(response, errorMessage);
        } catch (err) {
            console.error('❌ OpenAI analysis failed:', err);
            return {
                category: 'Unknown Error',
                confidence: 0,
                rootCause: errorMessage,
                suggestion: 'AI analysis failed. Check logs.',
            };
        }
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

    private async queryOpenAI(prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                model: this.MODEL,
                messages: [
                    { role: 'user', content: prompt }
                ]
            });

            const options = {
                hostname: this.API_URL,
                path: this.API_PATH,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 30000 // 30 second timeout
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const json = JSON.parse(data);
                            // Extract content from OpenAI response format
                            const content = json.choices?.[0]?.message?.content || '';
                            resolve(content);
                        } catch (e) {
                            console.error('❌ Invalid JSON from OpenAI:', data.substring(0, 200));
                            reject(new Error('Invalid JSON from OpenAI'));
                        }
                    } else {
                        console.error(`❌ OpenAI API Error: ${res.statusCode}`);
                        reject(new Error(`OpenAI API Error: ${res.statusCode} ${data}`));
                    }
                });
            });

            req.on('error', (e) => {
                console.error('❌ OpenAI request error:', e.message);
                reject(e);
            });

            req.on('timeout', () => {
                console.error('❌ OpenAI request timeout (30s)');
                req.destroy();
                reject(new Error('OpenAI request timeout'));
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
            if (jsonStr.lastIndexOf('}') < jsonStr.lastIndexOf('"')) {
                jsonStr += '"}';
            }

            const result = JSON.parse(jsonStr);

            return {
                category: result.category || 'Unknown Error',
                confidence: 0.95, // High confidence for GPT-based analysis
                rootCause: result.rootCause || originalError,
                suggestion: result.suggestion || 'Check the error message manually.',
                fixExample: result.fixExample
            };
        } catch (e) {
            console.warn('⚠️ Failed to parse OpenAI response as JSON. Raw response:', response);
            return {
                category: 'Unknown Error',
                confidence: 0.5,
                rootCause: originalError,
                suggestion: 'Could not parse AI advice. ' + response.substring(0, 100) + '...',
            };
        }
    }

    private testConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                model: this.MODEL,
                messages: [
                    { role: 'user', content: 'Hello' }
                ]
            });

            const options = {
                hostname: this.API_URL,
                path: this.API_PATH,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 10000 // 10 second timeout for connection test
            };

            const req = https.request(options, (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Status ${res.statusCode}`));
                }
                // Consume response data to free up memory
                res.on('data', () => { });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Connection timeout'));
            });

            req.write(postData);
            req.end();
        });
    }
}
