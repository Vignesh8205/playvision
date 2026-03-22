import type { TestCase, TestResult as PWTestResult } from '@playwright/test/reporter';
import { AIAnalysis, TestResult, TestStep } from '../schema/types';
import { IEventCollector } from './interfaces';
import { AIAnalyzerFactory, AIMode } from '../ai';
import { sanitizeFilename } from '../utils/helpers';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Collects and manages test execution events
 */
export class EventCollector implements IEventCollector {
    private results: Map<string, TestResult> = new Map();
    private aiMode: AIMode;
    private aiAnalysisEnabled: boolean;
    private pendingTasks: Promise<void>[] = [];

    constructor(aiMode: AIMode = AIMode.SMART, aiAnalysisEnabled: boolean = true) {
        this.aiMode = aiMode;
        this.aiAnalysisEnabled = aiAnalysisEnabled;
    }

    startTest(test: TestCase): void {
        const testId = this.generateStableTestId(test);

        if (!this.results.has(testId)) {
            this.results.set(testId, {
                testId,
                title: test.title,
                suite: test.parent.title,
                status: 'passed',
                startTime: Date.now(),
                endTime: 0,
                duration: 0,
                retries: 0,
                steps: [],
                attachments: []
            });
        } else {
            // Unset the error if retry starts, so if it fails again, it populates fresh.
            // But we keep the object reference so pending endTest calls don't point to detached objects
            const existing = this.results.get(testId)!;
            // Optionally clear past steps so we only see the latest attempt's steps
            existing.steps = [];
            existing.attachments = [];
            // Do NOT delete existing.error so flaky tests keep their error context
        }
    }

    async endTest(test: TestCase, result: PWTestResult): Promise<void> {
        const testId = this.generateStableTestId(test);
        const testResult = this.results.get(testId);

        console.log(`\nendTest called for: ${test.title}, Status: ${result.status}`);

        if (!testResult) {
            console.log(`No testResult found for ${testId}`);
            return;
        }

        testResult.endTime = Date.now();
        testResult.duration = result.duration;
        testResult.status = result.status as any;
        testResult.retries = result.retry;

        // Collect steps
        testResult.steps = this.extractSteps(result);

        // Collect attachments metadata with relative paths
        testResult.attachments = result.attachments.map((att, index) => {
            const sanitizedTitle = sanitizeFilename(test.title);
            const ext = att.path ? path.extname(att.path) : '';
            const type = this.getAttachmentType(att.contentType);

            // Determine the folder based on type
            let folder = '';
            if (type === 'screenshot') folder = 'screenshots';
            else if (type === 'video') folder = 'videos';
            else if (type === 'trace') folder = 'traces';

            // Create relative path to the copied asset
            const relativePath = folder ? `assets/${folder}/${sanitizedTitle}-${index}${ext}` : att.path || '';

            // Embed base64 for screenshots to prevent security errors during PDF export
            let base64: string | undefined;
            if (type === 'screenshot' && att.path && fs.existsSync(att.path)) {
                try {
                    const buffer = fs.readFileSync(att.path);
                    base64 = `data:${att.contentType};base64,${buffer.toString('base64')}`;
                } catch (e) {
                    console.warn(`Failed to embed base64 for screenshot: ${att.path}`, e);
                }
            }

            return {
                name: att.name || `attachment-${index}`,
                type,
                path: relativePath,
                contentType: att.contentType,
                base64
            };
        });

        // Extract error from multiple sources
        let errorMessage = '';
        let errorStack = '';
        let lineNumber: number | undefined;
        let columnNumber: number | undefined;
        let failedStepName: string | undefined;

        if (result.status !== 'passed' && result.status !== 'skipped') {
            // Source 1: result.errors array (Playwright v1.20+)
            if (result.errors && result.errors.length > 0) {
                errorMessage = result.errors[0].message || '';
                errorStack = result.errors[0].stack || '';
                
                // Parse line and column from stack
                const stackLines = errorStack.split('\n');
                const firstStackLine = stackLines.find(line => line.includes(test.location.file));
                if (firstStackLine) {
                    const match = firstStackLine.match(/:(\d+):(\d+)/);
                    if (match) {
                        lineNumber = parseInt(match[1], 10);
                        columnNumber = parseInt(match[2], 10);
                    }
                }
            }
            // Source 2: result.error property (older Playwright)
            else if ((result as any).error) {
                errorMessage = (result as any).error.message || '';
                errorStack = (result as any).error.stack || '';
            }

            // Identify failed step
            const failedStep = testResult.steps.find(s => s.status === 'failed');
            if (failedStep) {
                failedStepName = failedStep.name;
                if (!errorMessage && failedStep.error) {
                    errorMessage = failedStep.error;
                    errorStack = failedStep.error;
                }
            }

            // If we found an error, analyze it and save
            if (errorMessage) {
                try {
                    let aiAnalysis: AIAnalysis | undefined;

                    if (this.aiAnalysisEnabled) {
                        console.log(`Analyzing error for: ${testResult.title}`);
                        const analyzer = await AIAnalyzerFactory.create(this.aiMode);

                        const error = new Error(errorMessage);
                        error.stack = errorStack;

                        aiAnalysis = await analyzer.analyze(error);

                        if (aiAnalysis) {
                            console.log(`AI: ${aiAnalysis.category} (${(aiAnalysis.confidence * 100).toFixed(0)}%)`);
                        }
                    }

                    testResult.error = {
                        message: errorMessage,
                        stack: errorStack,
                        aiAnalysis,
                        lineNumber,
                        columnNumber,
                        specFile: test.location.file,
                        failedStepName
                    };

                    console.log(`Saved error to testResult. Has aiAnalysis: ${!!aiAnalysis}`);
                } catch (err) {
                    console.warn('AI analysis failed:', err);
                    testResult.error = {
                        message: errorMessage,
                        stack: errorStack,
                        lineNumber,
                        columnNumber,
                        specFile: test.location.file,
                        failedStepName
                    };
                }
            } else {
                console.log(`No error message found for failed test: ${testResult.title} (status: ${result.status})`);
            }
        }
    }

    /**
     * Wait for all background collection tasks (e.g., AI analysis) to complete
     */
    async waitForCompletion(): Promise<void> {
        if (this.pendingTasks.length > 0) {
            console.log(`Waiting for ${this.pendingTasks.length} background tasks to complete...`);
            await Promise.all(this.pendingTasks);
        }
    }

    getResults(): TestResult[] {
        const results = Array.from(this.results.values());
        const withErrors = results.filter(r => r.error).length;
        const withAI = results.filter(r => r.error?.aiAnalysis).length;
        console.log(`\nReturning ${results.length} results: ${withErrors} with errors, ${withAI} with AI analysis\n`);
        return results;
    }

    clear(): void {
        this.results.clear();
    }

    private extractSteps(result: PWTestResult): TestStep[] {
        const steps: TestStep[] = [];

        result.steps.forEach(step => {
            steps.push({
                name: step.title,
                category: step.category,
                startTime: step.startTime.getTime(),
                duration: step.duration,
                status: step.error ? 'failed' : 'passed',
                error: step.error?.message
            });
        });

        return steps;
    }

    private getAttachmentType(contentType: string): 'screenshot' | 'video' | 'trace' {
        if (contentType.includes('image')) return 'screenshot';
        if (contentType.includes('video')) return 'video';
        return 'trace';
    }

    private generateStableTestId(test: TestCase): string {
        const titlePath = typeof test.titlePath === 'function' ? test.titlePath() : [];
        const location = test.location?.file || '';
        const idSource = [location, ...titlePath].filter(Boolean).join('::');
        return sanitizeFilename(idSource || `${test.parent.title}::${test.title}`);
    }
}
