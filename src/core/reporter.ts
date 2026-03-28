import type { Reporter, TestCase, TestResult as PWTestResult, FullConfig, Suite, FullResult } from '@playwright/test/reporter';
import { PlayVisionConfig, ReportMetadata } from '../schema/types';
import { EventCollector } from '../collector/event-collector';
import { AssetCollector } from '../collector/asset-collector';
import { DataSerializer } from './serializer';
import { HTMLRenderer } from '../html/renderer';
import { ExportManager } from './export-manager';
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
    private exportManager: ExportManager;
    private metadata: ReportMetadata;
    private pendingTasks: Promise<void>[] = [];

    constructor(options: Partial<PlayVisionConfig> = {}) {
        this.config = {
            outputFolder: options.outputFolder || 'playvision-report',
            screenshots: options.screenshots ?? true,
            videos: options.videos || 'retain-on-failure',
            aiAnalysis: options.aiAnalysis ?? true,
            aiMode: options.aiMode || 'smart',
            exportPdf: options.exportPdf ?? false,
            exportExcel: options.exportExcel ?? false
        };

        const aiMode = this.config.aiMode as AIMode;
        this.eventCollector = new EventCollector(aiMode, this.config.aiAnalysis);
        this.assetCollector = new AssetCollector(this.config.outputFolder);
        this.serializer = new DataSerializer(this.config.outputFolder);
        this.htmlRenderer = new HTMLRenderer(this.config.outputFolder);
        this.exportManager = new ExportManager(this.config.outputFolder, this.config);

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

        // Recalculate metadata from deduplicated results for accurate counts
        const results = this.eventCollector.getResults();
        this.metadata.totalTests = results.length;
        this.metadata.passed = results.filter(r => r.status === 'passed').length;
        this.metadata.failed = results.filter(r => r.status === 'failed' || r.status === 'timedOut').length;
        this.metadata.skipped = results.filter(r => r.status === 'skipped').length;
        this.metadata.flaky = results.filter(r => r.retries > 0 && r.status === 'passed').length;

        console.log('📊 Generating PlayVision Report...');

        // Serialize to JSON
        await this.serializer.writeResults(results, this.metadata);

        // Generate HTML report
        await this.htmlRenderer.generate(results, this.metadata);

        // Export to other formats (Excel, PDF)
        await this.exportManager.export(results, this.metadata);

        console.log(`✅ Report generated: ${this.config.outputFolder}/index.html`);
        console.log(`📈 Summary: ${this.metadata.passed} passed, ${this.metadata.failed} failed, ${this.metadata.skipped} skipped${this.metadata.flaky ? ` (${this.metadata.flaky} flaky)` : ''}`);
    }

    private updateMetadata(result: PWTestResult): void {
        // No longer incrementing counts here because it double-counts retries.
        // Counts are now derived from deduplicated results in onEnd.
    }
}

export default PlayVisionReporter;
