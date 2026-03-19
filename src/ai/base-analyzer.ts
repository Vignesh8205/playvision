import { IAIAnalyzer } from './interfaces';
import { AIAnalysis } from '../schema/types';
import * as errorConfig from './error-config.json';

/**
 * Base analyzer with common functionality
 * Loads configuration from error-config.json
 */
export abstract class BaseAIAnalyzer implements IAIAnalyzer {
    protected ERROR_CATEGORIES: string[];
    protected SUGGESTIONS: Record<string, string>;
    protected FIX_EXAMPLES: Record<string, string>;
    protected PATTERNS: Record<string, RegExp>;

    constructor() {
        // Load configuration from JSON
        const config = errorConfig;

        this.ERROR_CATEGORIES = config.categories;
        this.SUGGESTIONS = config.suggestions;
        this.FIX_EXAMPLES = config.fixExamples;

        // Convert string patterns to RegExp
        this.PATTERNS = {};
        for (const [category, pattern] of Object.entries(config.patterns)) {
            this.PATTERNS[category] = new RegExp(pattern as string, 'i');
        }
    }

    abstract analyze(error: Error): Promise<AIAnalysis>;

    protected stripAnsi(text: string): string {
        // eslint-disable-next-line no-control-regex
        return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-7|key|@|A-Z|a-z]/g, '');
    }

    protected extractRootCause(errorMessage: string, category: string): string {
        const cleanMessage = this.stripAnsi(errorMessage);
        
        // Extract selector from locator errors
        const selectorMatch = cleanMessage.match(/selector\s+["']([^"']+)["']/i) || 
                              cleanMessage.match(/waiting for ([^\s]+)/i);
        if (selectorMatch && (category.includes('Locator') || category.includes('Selector'))) {
            return `Selector "${selectorMatch[1]}" could not be found or interacted with in the DOM`;
        }

        // Extract timeout duration
        const timeoutMatch = cleanMessage.match(/timeout of (\d+)ms/i) || 
                             cleanMessage.match(/Timeout (\d+)ms exceeded/i);
        if (timeoutMatch && category.includes('Timeout')) {
            return `Operation exceeded timeout of ${timeoutMatch[1]}ms. The page or element took too long to respond.`;
        }

        return cleanMessage.split('\n')[0]; // First line as root cause
    }

    protected extractScriptImprovements(errorMessage: string, category: string): AIAnalysis['scriptImprovements'] {
        const improvements: AIAnalysis['scriptImprovements'] = [];
        
        const selectorMatch = errorMessage.match(/selector\s+["']([^"']+)["']/i);
        if (selectorMatch) {
            improvements.push({
                type: 'selector',
                current: selectorMatch[1],
                suggested: `Try using a more robust selector like [data-testid="..."] or a role-based selector: page.getByRole('button', { name: '...' })`,
                reason: 'The current selector might be too fragile or dependent on volatile DOM structure.'
            });
        }

        if (category.includes('Timeout')) {
            improvements.push({
                type: 'wait',
                current: 'Default timeout',
                suggested: 'Use page.waitForSelector() or increase the specific action timeout.',
                reason: 'The element requires more time to become actionable than the default configuration allows.'
            });
        }

        return improvements.length > 0 ? improvements : undefined;
    }

    protected analyzeFlakiness(errorMessage: string, category: string): AIAnalysis['flakinessAnalysis'] {
        if (category.includes('Timeout') || category.includes('Network')) {
            return {
                isLikelyFlaky: true,
                reason: 'Network fluctuations or slow rendering can cause intermittent failures for this error type.',
                recommendation: 'Implement retry logic or use web-first assertions that wait automatically.'
            };
        }
        return {
            isLikelyFlaky: false,
            reason: 'This error appears to be a consistent functional or logic issue.',
            recommendation: 'Fix the underlying code or locator.'
        };
    }

    protected getFixExample(category: string): string | undefined {
        return this.FIX_EXAMPLES[category];
    }

    protected getPatterns(): Record<string, RegExp> {
        return this.PATTERNS;
    }

    /**
     * Extract and parse JSON from LLM response strings that might contain conversational text
     */
    protected robustParseJSON(text: string): any {
        const cleanText = text.trim();
        
        // 1. Try direct parse first
        try {
            return JSON.parse(cleanText);
        } catch (e) {
            // Proceed to robust parsing
        }

        try {
            // 2. Extract JSON block or use full text
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : cleanText;

            const result: any = {};
            const keys = ['category', 'confidence', 'rootCause', 'suggestion', 'fixExample', 'severity'];
            
            // Use known keys as anchors for splitting the potentially malformed JSON
            const keyRegex = new RegExp(`"(${keys.join('|')})"` + '\\s*:', 'i');
            const parts = jsonStr.split(keyRegex);
            
            // parts[0] is usually '{' or preamble text
            // Subsequent parts come in pairs: [key, value]
            for (let i = 1; i < parts.length; i += 2) {
                const rawKey = parts[i];
                // Map to actual key names from the list to preserve proper casing (camelCase)
                const key = keys.find(k => k.toLowerCase() === rawKey.toLowerCase()) || rawKey;
                let value = parts[i + 1] || '';
                
                value = value.trim();
                
                // Remove trailing comma or semicolon
                value = value.replace(/[,;]\s*$/, '');
                
                // If this is the last part, remove the trailing brace if it exists
                if (i + 2 >= parts.length) {
                    value = value.replace(/\s*\}\s*$/, '');
                }

                // Strip surrounding quotes
                value = value.replace(/^["']|["']$/g, '');
                
                // Unescape common JSON characters
                value = value.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                
                result[key] = value.trim();
            }

            // 6. Clean up confidence to number if possible
            if (result.confidence) {
                const num = parseFloat(result.confidence);
                if (!isNaN(num)) result.confidence = num;
            } else {
                result.confidence = 0.9;
            }

            // 7. Infer category if missing
            if (!result.category) {
                const cleanTextForPatterns = this.stripAnsi(jsonStr);
                for (const [cat, pattern] of Object.entries(this.PATTERNS)) {
                    if (pattern.test(cleanTextForPatterns)) {
                        result.category = cat;
                        break;
                    }
                }
            }

            if (Object.keys(result).length > 0) {
                return result;
            }

            return this.extractFromPlainText(cleanText);
        } catch (finalE: any) {
            console.warn('⚠️ Safe parsing failed to recover fields:', finalE?.message || finalE);
            return {
                rootCause: cleanText.substring(0, 500) || 'AI returned an empty response.'
            };
        }
    }

    private extractFromPlainText(text: string): any {
        const result: any = {};
        const categories = ['category', 'rootCause', 'suggestion', 'fixExample', 'severity'];
        
        for (const key of categories) {
            const regex = new RegExp(`${key}["'\\s]*:?\\s*["']?([^"'\n\r}]+)`, 'i');
            const match = text.match(regex);
            if (match) {
                result[key] = match[1].trim().replace(/["'}]+$/, '');
            }
        }

        if (Object.keys(result).length > 0) {
            console.log('💡 Recovered partial data from non-JSON response');
            return result;
        }

        // Final fallback: Use pattern matching on the whole text
        const fallbackResult: any = {
            rootCause: text.substring(0, 500) || 'AI returned an empty response.'
        };
        
        const cleanText = this.stripAnsi(text);
        for (const [cat, pattern] of Object.entries(this.PATTERNS)) {
            if (pattern.test(cleanText)) {
                fallbackResult.category = cat;
                break;
            }
        }
        
        return fallbackResult;
    }

    /**
     * Perform deep heuristic analysis based on error patterns and configuration
     * This is the ultimate fallback when AI fails or returns empty data.
     */
    protected performHeuristicAnalysis(error: Error): AIAnalysis {
        const fullMessage = error.message || error.toString();
        const cleanMessage = this.stripAnsi(fullMessage);
        const patterns = this.getPatterns();
        
        // 1. Try to categorize using patterns
        let category = 'Unknown Error';
        for (const [cat, pattern] of Object.entries(patterns)) {
            if (pattern.test(cleanMessage)) {
                category = cat;
                break;
            }
        }

        // 2. Extract specific context
        const rootCause = this.extractRootCause(cleanMessage, category);
        const suggestion = this.SUGGESTIONS[category] || this.SUGGESTIONS['Unknown Error'];
        const fixExample = this.getFixExample(category);

        return {
            category,
            confidence: 0.8, // Fairly confident for deterministic patterns
            rootCause,
            suggestion,
            fixExample,
            scriptImprovements: this.extractScriptImprovements(cleanMessage, category),
            flakinessAnalysis: this.analyzeFlakiness(cleanMessage, category),
            analyzedAt: Date.now(),
            model: 'Heuristic Pattern Matcher'
        };
    }
}
