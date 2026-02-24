import { TestCase, TestResult as PWTestResult } from '@playwright/test/reporter';
import { TestResult, TestStep } from '../schema/types';
import { IEventCollector } from './interfaces';
import { AIAnalyzerFactory, AIMode } from '../ai';
import { generateTestId, sanitizeFilename } from '../utils/helpers';
import * as path from 'path';

/**
 * Collects and manages test execution events
 */
export class EventCollector implements IEventCollector {
    private results: Map<string, TestResult> = new Map();
    private aiMode: AIMode;

    constructor(aiMode: AIMode = AIMode.SMART) {
        this.aiMode = aiMode;
    }

    startTest(test: TestCase): void {
        const testId = generateTestId(test.parent.title, test.title);

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
    }

    async endTest(test: TestCase, result: PWTestResult): Promise<void> {
        const testId = generateTestId(test.parent.title, test.title);
        const testResult = this.results.get(testId);

        console.log(`\n🏁 endTest called for: ${test.title}, Status: ${result.status}`);

        if (!testResult) {
            console.log(`⚠️ No testResult found for ${testId}`);
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
            const testId = sanitizeFilename(test.title);
            const ext = att.path ? path.extname(att.path) : '';
            const type = this.getAttachmentType(att.contentType);

            // Determine the folder based on type
            let folder = '';
            if (type === 'screenshot') folder = 'screenshots';
            else if (type === 'video') folder = 'videos';
            else if (type === 'trace') folder = 'traces';

            // Create relative path to the copied asset
            const relativePath = folder ? `assets/${folder}/${testId}-${index}${ext}` : att.path || '';

            return {
                name: att.name || `attachment-${index}`,
                type,
                path: relativePath,
                contentType: att.contentType
            };
        });

        // Extract error from multiple sources
        let errorMessage = '';
        let errorStack = '';

        if (result.status !== 'passed' && result.status !== 'skipped') {
            // Source 1: result.errors array (Playwright v1.20+)
            if (result.errors && result.errors.length > 0) {
                errorMessage = result.errors[0].message || '';
                errorStack = result.errors[0].stack || '';
                console.log(`📍 Error from result.errors`);
            }
            // Source 2: result.error property (older Playwright)
            else if ((result as any).error) {
                errorMessage = (result as any).error.message || '';
                errorStack = (result as any).error.stack || '';
                console.log(`📍 Error from result.error`);
            }
            // Source 3: Extract from failed step
            else {
                const failedStep = testResult.steps.find(s => s.status === 'failed');
                if (failedStep && failedStep.error) {
                    errorMessage = failedStep.error;
                    errorStack = failedStep.error;
                    console.log(`📍 Error from failed step: ${failedStep.name}`);
                }
            }

            // If we found an error, analyze it and save
            if (errorMessage) {
                try {
                    console.log(`🔍 Analyzing error for: ${testResult.title}`);
                    const analyzer = await AIAnalyzerFactory.create(this.aiMode);

                    const error = new Error(errorMessage);
                    error.stack = errorStack;

                    const aiAnalysis = await analyzer.analyze(error);

                    if (aiAnalysis) {
                        console.log(`✅ AI: ${aiAnalysis.category} (${(aiAnalysis.confidence * 100).toFixed(0)}%)`);
                    }

                    testResult.error = {
                        message: errorMessage,
                        stack: errorStack,
                        aiAnalysis
                    };

                    console.log(`💾 Saved error to testResult. Has aiAnalysis: ${!!aiAnalysis}`);
                } catch (err) {
                    console.warn('⚠️ AI analysis failed:', err);
                    testResult.error = {
                        message: errorMessage,
                        stack: errorStack
                    };
                }
            } else {
                console.log(`⚠️ No error message found for failed test: ${testResult.title} (status: ${result.status})`);
            }
        }
    }

    getResults(): TestResult[] {
        const results = Array.from(this.results.values());
        const withErrors = results.filter(r => r.error).length;
        const withAI = results.filter(r => r.error?.aiAnalysis).length;
        console.log(`\n📊 Returning ${results.length} results: ${withErrors} with errors, ${withAI} with AI analysis\n`);
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
}
