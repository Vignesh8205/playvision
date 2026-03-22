import { BaseAIAnalyzer } from './base-analyzer';
import { AIAnalysis } from '../schema/types';
import * as http from 'http';
import * as https from 'https';

/**
 * OpenAI-Compatible API Analyzer
 * Uses OpenAI-compatible API for error analysis
 * Configuration is loaded from environment variables
 */
export class OpenAIAnalyzer extends BaseAIAnalyzer {
    private readonly API_PROTOCOL: 'http:' | 'https:';
    private readonly API_HOST: string;
    private readonly API_PORT: number;
    private readonly API_PATH: string;
    private readonly MODEL: string;
    private readonly API_KEY: string;
    private initialized = false;

    constructor() {
        super();

        // Load from environment variables with fallback to defaults.
        const rawApiUrl = process.env.OPENAI_API_URL || 'https://api.apifree.ai/v1/chat/completions';
        const parsed = new URL(rawApiUrl);

        this.API_PROTOCOL = parsed.protocol === 'http:' ? 'http:' : 'https:';
        this.API_HOST = parsed.hostname;
        this.API_PORT = parsed.port
            ? Number(parsed.port)
            : this.API_PROTOCOL === 'https:'
                ? 443
                : 80;
        this.API_PATH = `${parsed.pathname || '/v1/chat/completions'}${parsed.search || ''}`;

        this.MODEL = process.env.OPENAI_MODEL || 'openai/gpt-5.2';
        this.API_KEY = process.env.OPENAI_API_KEY || '';

        if (!this.API_KEY) {
            console.warn('OPENAI_API_KEY not found in environment variables. OpenAI analyzer may not work.');
        }
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('Initializing OpenAI-compatible API analyzer...');
        try {
            await this.testConnection();
            console.log('OpenAI API connection established');
            this.initialized = true;
        } catch (error) {
            console.warn('Could not connect to OpenAI API:', error);
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

        const errorMessage = this.stripAnsi(error.message);
        const stackTrace = this.stripAnsi(error.stack || '');
        const prompt = this.createPrompt(errorMessage, stackTrace);

        try {
            const response = await this.queryOpenAI(prompt);
            const analysis = this.parseResponse(response, errorMessage);

            // If parsing returned a generic "Unknown" or empty cause, use heuristics instead
            if (analysis.category === 'Unknown Error' || (analysis.rootCause && analysis.rootCause.includes('empty response'))) {
                console.log('💡 OpenAI response was poor, falling back to heuristic analysis.');
                return this.performHeuristicAnalysis(error);
            }

            return analysis;
        } catch (err) {
            console.error('OpenAI analysis failed:', err);
            return this.performHeuristicAnalysis(error);
        }
    }

    private createPrompt(errorMessage: string, stackTrace: string): string {
        const errorContext = stackTrace ? stackTrace.substring(0, 4000) : errorMessage.substring(0, 2000);

        return `You are a Senior Playwright Automation Expert. Perform a deep forensic analysis of this test failure.

### ERROR CONTEXT:
${errorContext}

### MANDATORY STEPS:
1. **Root Cause**: Explain exactly why the failure happened. Mention specific locators, URLs, or expected/actual values found in the log. Be thorough (2-3 sentences).
2. **Category**: Choose EXACTLY ONE from this list: [${this.ERROR_CATEGORIES.join(', ')}].
3. **Actionable Suggestions**: Provide a numbered list of 3-4 specific steps. Do NOT be generic. Tell the user exactly which line or component to check.
4. **Fix Example**: Write a complete runnable Playwright code snippet that directly addresses the specific failure.

### RESPONSE FORMAT:
- Return ONLY a raw JSON object.
- No markdown code blocks, no backticks, no conversational filler.
- Pick ONE category only.
- Use "\\n" for newlines inside JSON string values.

### JSON SCHEMA:
{
  "category": "string",
  "severity": "critical | high | medium | low",
  "confidence": 0.99,
  "rootCause": "string",
  "impact": "string",
  "suggestion": "string",
  "prevention": "string",
  "fixExample": "string",
  "estimatedFixTime": "string",
  "tags": ["tag1", "tag2"]
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
                protocol: this.API_PROTOCOL,
                hostname: this.API_HOST,
                port: this.API_PORT,
                path: this.API_PATH,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 30000
            };

            const client = this.API_PROTOCOL === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const json = JSON.parse(data);
                            const content = json.choices?.[0]?.message?.content || '';
                            resolve(content);
                        } catch (e) {
                            console.error('Invalid JSON from OpenAI:', data.substring(0, 200));
                            reject(new Error('Invalid JSON from OpenAI'));
                        }
                    } else {
                        console.error(`OpenAI API Error: ${res.statusCode}`);
                        reject(new Error(`OpenAI API Error: ${res.statusCode} ${data}`));
                    }
                });
            });

            req.on('error', (e) => {
                console.error('OpenAI request error:', e.message);
                reject(e);
            });

            req.on('timeout', () => {
                console.error('OpenAI request timeout (30s)');
                req.destroy();
                reject(new Error('OpenAI request timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    private parseResponse(response: string, originalError: string): AIAnalysis {
        try {
            const result = this.robustParseJSON(response);

            const validSeverities = ['critical', 'high', 'medium', 'low'];
            const severity = validSeverities.includes(result.severity) ? result.severity : 'medium';

            let suggestion = result.suggestion || 'Check the error message manually.';
            if (Array.isArray(suggestion)) {
                suggestion = suggestion.join('\n');
            }

            return {
                category: result.category || 'Unknown Error',
                confidence: typeof result.confidence === 'number' ? result.confidence : 0.95,
                rootCause: result.rootCause || originalError,
                suggestion: suggestion,
                fixExample: result.fixExample,
                severity: severity as 'critical' | 'high' | 'medium' | 'low',
                impact: result.impact,
                prevention: result.prevention,
                estimatedFixTime: result.estimatedFixTime,
                tags: Array.isArray(result.tags) ? result.tags.slice(0, 6) : [],
                model: this.MODEL,
                analyzedAt: Date.now(),
                scriptImprovements: this.extractScriptImprovements(originalError, result.category || ''),
                flakinessAnalysis: this.analyzeFlakiness(originalError, result.category || ''),
            };
        } catch (e) {
            console.warn('Failed to parse OpenAI response safely. Raw response:', response);
            return {
                category: 'Unknown Error',
                confidence: 0.5,
                rootCause: originalError,
                suggestion: 'Could not parse AI advice. ' + response.substring(0, 100) + '...',
                severity: 'medium',
                analyzedAt: Date.now(),
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
                protocol: this.API_PROTOCOL,
                hostname: this.API_HOST,
                port: this.API_PORT,
                path: this.API_PATH,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 10000
            };

            const client = this.API_PROTOCOL === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Status ${res.statusCode}`));
                }
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
