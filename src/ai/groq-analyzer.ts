import { BaseAIAnalyzer } from './base-analyzer';
import { AIAnalysis } from '../schema/types';
import * as http from 'http';
import * as https from 'https';

/**
 * Groq API Analyzer
 * Uses Groq's high-speed inference API for error analysis
 * Configuration is loaded from environment variables
 */
export class GroqAnalyzer extends BaseAIAnalyzer {
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
        const rawApiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
        const parsed = new URL(rawApiUrl);

        this.API_PROTOCOL = parsed.protocol === 'http:' ? 'http:' : 'https:';
        this.API_HOST = parsed.hostname;
        this.API_PORT = parsed.port
            ? Number(parsed.port)
            : this.API_PROTOCOL === 'https:'
                ? 443
                : 80;
        this.API_PATH = `${parsed.pathname || '/v1/chat/completions'}${parsed.search || ''}`;

        this.MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        this.API_KEY = process.env.GROQ_API_KEY || '';

        if (!this.API_KEY) {
            console.warn('GROQ_API_KEY not found in environment variables. Groq analyzer may not work.');
        }
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('Initializing Groq API analyzer...');
        try {
            await this.testConnection();
            console.log('Groq API connection established');
            this.initialized = true;
        } catch (error) {
            console.warn('Could not connect to Groq API:', error);
            this.initialized = false;
        }
    }

    isReady(): boolean {
        return this.initialized;
    }

    async analyze(error: Error): Promise<AIAnalysis> {
        if (!this.initialized) {
            throw new Error('Groq Analyzer not initialized');
        }

        const errorMessage = this.stripAnsi(error.message);
        const stackTrace = this.stripAnsi(error.stack || '');
        const prompt = this.createPrompt(errorMessage, stackTrace);

        try {
            const response = await this.queryGroq(prompt);
            const analysis = this.parseResponse(response, errorMessage);

            // If parsing returned a generic "Unknown" or empty cause, use heuristics instead
            if (analysis.category === 'Unknown Error' || (analysis.rootCause && analysis.rootCause.includes('empty response'))) {
                console.log('💡 Groq response was poor, falling back to heuristic analysis.');
                return this.performHeuristicAnalysis(error);
            }

            return analysis;
        } catch (err) {
            console.error('Groq analysis failed:', err);
            return this.performHeuristicAnalysis(error);
        }
    }

    private createPrompt(errorMessage: string, stackTrace: string): string {
        const errorContext = stackTrace ? stackTrace.substring(0, 4000) : errorMessage.substring(0, 2000);

        return `You are a Senior Playwright Automation Expert. Perform a deep forensic analysis of this test failure.

### ERROR CONTEXT:
${errorContext}

### MANDATORY STEPS:
1. **Root Cause**: Provide a highly specific, concise technical explanation of the failure. State the exact locator, URL, or condition that failed without any introductory filler (1-2 sentences).
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

    private async queryGroq(prompt: string): Promise<string> {
        const postData = JSON.stringify({
            model: this.MODEL,
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        const url = `${this.API_PROTOCOL}//${this.API_HOST}${this.API_PORT === 80 || this.API_PORT === 443 ? '' : ':' + this.API_PORT}${this.API_PATH}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: postData,
                signal: controller.signal as any
            });

            const data = await res.text();

            if (res.ok) {
                try {
                    const json = JSON.parse(data);
                    return json.choices?.[0]?.message?.content || '';
                } catch (e) {
                    console.error('Invalid JSON from Groq:', data.substring(0, 200));
                    throw new Error('Invalid JSON from Groq');
                }
            } else {
                console.error(`Groq API Error: ${res.status}`);
                throw new Error(`Groq API Error: ${res.status} ${data}`);
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.error('Groq request timeout (30s)');
                throw new Error('Groq request timeout');
            }
            console.error('Groq request error:', e.message);
            throw e;
        } finally {
            clearTimeout(timeout);
        }
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
            console.warn('Failed to parse Groq response safely. Raw response:', response);
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

    private async testConnection(): Promise<void> {
        const postData = JSON.stringify({
            model: this.MODEL,
            messages: [
                { role: 'user', content: 'Hello' }
            ]
        });

        const url = `${this.API_PROTOCOL}//${this.API_HOST}${this.API_PORT === 80 || this.API_PORT === 443 ? '' : ':' + this.API_PORT}${this.API_PATH}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: postData,
                signal: controller.signal as any
            });

            if (!res.ok) {
                throw new Error(`Status ${res.status}`);
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                throw new Error('Connection timeout');
            }
            throw e;
        } finally {
            clearTimeout(timeout);
        }
    }
}
