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

        const errorMessage = error.message;
        const stackTrace = error.stack || '';
        const prompt = this.createPrompt(errorMessage, stackTrace);

        try {
            const response = await this.queryOpenAI(prompt);
            return this.parseResponse(response, errorMessage);
        } catch (err) {
            console.error('OpenAI analysis failed:', err);
            return {
                category: 'Unknown Error',
                confidence: 0,
                rootCause: errorMessage,
                suggestion: 'AI analysis failed. Check logs.',
            };
        }
    }

    private createPrompt(errorMessage: string, stackTrace: string): string {
        const errorContext = stackTrace ? stackTrace.substring(0, 2500) : errorMessage.substring(0, 1200);

        return `You are a senior QA Automation engineer and Playwright expert. Deeply analyze this Playwright/JavaScript test failure and provide comprehensive diagnostic information.
        
Error details:
${errorContext}

Respond ONLY with a valid JSON object. Do NOT use Markdown notation like \`\`\`json. Use this exact schema:
{
  "category": "one of [Selector Error, Timeout Error, Network Error, Assertion Error, Javascript Error, State Error, Authentication Error, Configuration Error]",
  "severity": "one of [critical, high, medium, low] - critical means the test blocks a release or core user journey; low means cosmetic/intermittent",
  "confidence": 0.95,
  "rootCause": "2-4 sentences: the precise technical reason this error occurred, including what was expected vs what happened, what component malfunctioned, and why.",
  "impact": "1-2 sentences describing the business or functional impact - what feature or user flow is broken, what risk this poses if shipped.",
  "suggestion": "Numbered list of 3-4 concrete, actionable steps to fix the issue. Each step must be a complete sentence.",
  "prevention": "1-3 bullet points describing coding patterns, test design improvements, or CI/CD practices that prevent this class of error recurring.",
  "fixExample": "A complete, runnable Playwright code snippet demonstrating the correct implementation. Include comments explaining the key change.",
  "estimatedFixTime": "e.g. '5 minutes', '30 minutes', '2 hours' - realistic estimate for an experienced dev",
  "tags": ["2-5 short lowercase tags relevant to this error, e.g. locator, async, assertion, network, selector"]
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
            let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();

            if (jsonStr.lastIndexOf('}') < jsonStr.lastIndexOf('"')) {
                jsonStr += '"}}';
            }

            const result = JSON.parse(jsonStr);

            const validSeverities = ['critical', 'high', 'medium', 'low'];
            const severity = validSeverities.includes(result.severity) ? result.severity : 'medium';

            return {
                category: result.category || 'Unknown Error',
                confidence: typeof result.confidence === 'number' ? result.confidence : 0.95,
                rootCause: result.rootCause || originalError,
                suggestion: result.suggestion || 'Check the error message manually.',
                fixExample: result.fixExample,
                severity: severity as 'critical' | 'high' | 'medium' | 'low',
                impact: result.impact,
                prevention: result.prevention,
                estimatedFixTime: result.estimatedFixTime,
                tags: Array.isArray(result.tags) ? result.tags.slice(0, 6) : [],
                model: this.MODEL,
                analyzedAt: Date.now(),
            };
        } catch (e) {
            console.warn('Failed to parse OpenAI response as JSON. Raw response:', response);
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
