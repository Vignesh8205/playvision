import { Reporter, TestCase, TestResult as PWTestResult, FullConfig, Suite, FullResult } from '@playwright/test/reporter';
import { PlayVisionConfig, ReportMetadata } from '../schema/types';
import { EventCollector } from '../collector/event-collector';
import { AssetCollector } from '../collector/asset-collector';
import { DataSerializer } from './serializer';
import { HTMLRenderer } from '../html/renderer';
import { AIMode } from '../ai';

/**
 * Main PlayVision Reporter class
 * Implements Playwright's Reporter interface
 */
export class PlayVisionReporter implements Reporter {
    private config: PlayVisionConfig;
    private eventCollector: EventCollector;
    private assetCollector: AssetCollector;
    private serializer: DataSerializer;
    private htmlRenderer: HTMLRenderer;
    private metadata: ReportMetadata;
    private pendingTasks: Promise<void>[] = [];

    constructor(options: Partial<PlayVisionConfig> = {}) {
        this.config = {
            outputFolder: options.outputFolder || 'playvision-report',
            screenshots: options.screenshots ?? true,
            videos: options.videos || 'retain-on-failure',
            aiAnalysis: options.aiAnalysis ?? true,
            aiMode: options.aiMode || 'smart'
        };

        const aiMode = this.config.aiMode as AIMode;
        this.eventCollector = new EventCollector(aiMode, this.config.aiAnalysis);
        this.assetCollector = new AssetCollector(this.config.outputFolder);
        this.serializer = new DataSerializer(this.config.outputFolder);
        this.htmlRenderer = new HTMLRenderer(this.config.outputFolder);

        this.metadata = {
            totalTests: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            flaky: 0,
            duration: 0,
            workers: 0,
            startTime: 0,
            endTime: 0
        };
    }

    onBegin(config: FullConfig, suite: Suite): void {
        console.log('🎬 PlayVision Reporter started');
        this.metadata.startTime = Date.now();
        this.metadata.workers = config.workers;
        this.assetCollector.initialize();
    }

    onTestBegin(test: TestCase): void {
        this.eventCollector.startTest(test);
    }

    onTestEnd(test: TestCase, result: PWTestResult): void {
        const task = (async () => {
            await this.eventCollector.endTest(test, result);
            this.updateMetadata(result);

            // Collect assets for failed tests
            if (result.status === 'failed' || result.status === 'timedOut') {
                await this.assetCollector.collectAssets(test, result);
            }
        })();
        this.pendingTasks.push(task);
    }

    async onEnd(result: FullResult): Promise<void> {
        if (this.pendingTasks.length > 0) {
            console.log(`⏳ Waiting for ${this.pendingTasks.length} background tasks (like AI analysis)...`);
            await Promise.all(this.pendingTasks);
        }

        this.metadata.endTime = Date.now();
        this.metadata.duration = this.metadata.endTime - this.metadata.startTime;

        console.log('📊 Generating PlayVision Report...');

        // Get all test results
        const results = this.eventCollector.getResults();

        // Serialize to JSON
        await this.serializer.writeResults(results, this.metadata);

        // Generate HTML report
        await this.htmlRenderer.generate(results, this.metadata);

        console.log(`✅ Report generated: ${this.config.outputFolder}/index.html`);
        console.log(`📈 Summary: ${this.metadata.passed} passed, ${this.metadata.failed} failed, ${this.metadata.skipped} skipped`);
    }

    private updateMetadata(result: PWTestResult): void {
        this.metadata.totalTests++;

        if (result.status === 'passed') this.metadata.passed++;
        else if (result.status === 'failed') this.metadata.failed++;
        else if (result.status === 'skipped') this.metadata.skipped++;
        else if (result.status === 'timedOut') this.metadata.failed++;

        if (result.retry > 0 && result.status === 'passed') {
            this.metadata.flaky++;
        }
    }
}

export default PlayVisionReporter;
