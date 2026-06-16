import { BaseAIAnalyzer } from './base-analyzer';
import { AIAnalysis } from '../schema/types';
import * as https from 'https';

/**
 * Gemini API Analyzer
 * Uses Google's Gemini API for error analysis
 * Configuration is loaded from environment variables
 */
export class GeminiAnalyzer extends BaseAIAnalyzer {
    private readonly API_HOST: string = 'generativelanguage.googleapis.com';
    private readonly MODEL: string;
    private readonly API_KEY: string;
    private initialized = false;

    constructor() {
        super();

        this.MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
        this.API_KEY = process.env.GEMINI_API_KEY || '';

        if (!this.API_KEY) {
            console.warn('GEMINI_API_KEY not found in environment variables. Gemini analyzer may not work.');
        }
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('Initializing Gemini API analyzer...');
        try {
            await this.testConnection();
            console.log('Gemini API connection established');
            this.initialized = true;
        } catch (error) {
            console.warn('Could not connect to Gemini API:', error);
            this.initialized = false;
        }
    }

    isReady(): boolean {
        return this.initialized;
    }

    async analyze(error: Error): Promise<AIAnalysis> {
        if (!this.initialized) {
            throw new Error('Gemini Analyzer not initialized');
        }

        const errorMessage = this.stripAnsi(error.message);
        const stackTrace = this.stripAnsi(error.stack || '');
        const prompt = this.createPrompt(errorMessage, stackTrace);

        try {
            const response = await this.queryGemini(prompt);
            const analysis = this.parseResponse(response, errorMessage);

            // If parsing returned a generic "Unknown" or empty cause, use heuristics instead
            if (analysis.category === 'Unknown Error' || (analysis.rootCause && analysis.rootCause.includes('empty response'))) {
                console.log('💡 Gemini response was poor, falling back to heuristic analysis.');
                return this.performHeuristicAnalysis(error);
            }

            return analysis;
        } catch (err) {
            console.error('Gemini analysis failed:', err);
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

    private async queryGemini(prompt: string): Promise<string> {
        const postData = JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const url = `https://${this.API_HOST}/v1beta/models/${this.MODEL}:generateContent?key=${this.API_KEY}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: postData,
                signal: controller.signal as any
            });

            const data = await res.text();

            if (res.ok) {
                try {
                    const json = JSON.parse(data);
                    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                } catch (e) {
                    console.error('Invalid JSON from Gemini:', data.substring(0, 200));
                    throw new Error('Invalid JSON from Gemini');
                }
            } else {
                console.error(`Gemini API Error: ${res.status}`);
                throw new Error(`Gemini API Error: ${res.status} ${data}`);
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.error('Gemini request timeout (30s)');
                throw new Error('Gemini request timeout');
            }
            console.error('Gemini request error:', e.message);
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
            console.warn('Failed to parse Gemini response safely. Raw response:', response);
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
            contents: [{
                parts: [{ text: "Hello" }]
            }]
        });

        const url = `https://${this.API_HOST}/v1beta/models/${this.MODEL}:generateContent?key=${this.API_KEY}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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
