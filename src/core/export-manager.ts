import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
// Use import type to prevent runtime load of @playwright/test which causes "double require" errors
// in environments with multiple node_modules
import type { chromium as ChromiumType } from '@playwright/test';
import { TestResult, ReportMetadata, PlayVisionConfig } from '../schema/types';

/**
 * Handles exporting test results to different formats (PDF, Excel)
 */
export class ExportManager {
    private outputFolder: string;
    private config: PlayVisionConfig;

    constructor(outputFolder: string, config: PlayVisionConfig) {
        this.outputFolder = outputFolder;
        this.config = config;
    }

    /**
     * Export results based on configuration
     */
    async export(results: TestResult[], metadata: ReportMetadata): Promise<void> {
        const tasks: Promise<void>[] = [];

        if (this.config.exportExcel) {
            tasks.push(this.generateExcel(results));
        }

        if (this.config.exportPdf) {
            tasks.push(this.generatePdf());
        }

        await Promise.all(tasks);
    }

    /**
     * Generate an Excel file with detailed failure data
     */
    private async generateExcel(results: TestResult[]): Promise<void> {
        console.log('📊 Generating Excel failure report...');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Failure Data');

        // Define columns
        sheet.columns = [
            { header: 'Test ID', key: 'id', width: 15 },
            { header: 'Suite', key: 'suite', width: 25 },
            { header: 'Test Title', key: 'title', width: 40 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Duration (ms)', key: 'duration', width: 15 },
            { header: 'Error Message', key: 'error', width: 50 },
            { header: 'AI Category', key: 'category', width: 20 },
            { header: 'AI Root Cause', key: 'rootCause', width: 50 },
            { header: 'AI Suggestion', key: 'suggestion', width: 50 }
        ];

        // Style header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add only failed or timed out tests
        const failures = results.filter(r => r.status === 'failed' || r.status === 'timedOut' || r.status === 'flaky');
        
        failures.forEach(test => {
            sheet.addRow({
                id: test.testId,
                suite: test.suite,
                title: test.title,
                status: test.status,
                duration: test.duration,
                error: test.error?.message || 'N/A',
                category: test.error?.aiAnalysis?.category || 'N/A',
                rootCause: test.error?.aiAnalysis?.rootCause || 'N/A',
                suggestion: test.error?.aiAnalysis?.suggestion || 'N/A'
            });
        });

        // Apply alignment
        sheet.eachRow((row) => {
            row.alignment = { vertical: 'middle', wrapText: true };
        });

        const outputPath = path.join(this.outputFolder, 'failure-data.xlsx');
        await workbook.xlsx.writeFile(outputPath);
        console.log(`✅ Excel report generated: ${outputPath}`);
    }

    /**
     * Generate a PDF Executive Summary using Playwright to print the HTML report
     */
    private async generatePdf(): Promise<void> {
        console.log('📄 Generating PDF Executive Summary...');
        const htmlPath = path.join(this.outputFolder, 'index.html');
        
        if (!fs.existsSync(htmlPath)) {
            console.warn('Cannot generate PDF: HTML report not found.');
            return;
        }

        try {
            // Dynamic require to avoid double load error at top level
            const { chromium } = require('@playwright/test') as { chromium: typeof ChromiumType };
            const browser = await chromium.launch();
            const page = await browser.newPage();
            
            // Load the local HTML file
            const absolutePath = `file://${path.resolve(htmlPath)}`;
            await page.goto(absolutePath, { waitUntil: 'networkidle', timeout: 60000 });

            // Wait for React to mount and images to potentially load
            await page.waitForSelector('header', { state: 'attached' });
            await page.waitForTimeout(2000); // Give it a bit more time for the asset grid

            const outputPath = path.join(this.outputFolder, 'executive-summary.pdf');
            await page.pdf({
                path: outputPath,
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
                displayHeaderFooter: true,
                headerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center;">PlayVision Pro - Executive Summary</div>',
                footerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
            });

            await browser.close();
            console.log(`✅ PDF report generated: ${outputPath}`);
        } catch (error) {
            console.error('❌ Failed to generate PDF report:', error);
        }
    }
}
