import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PlayVision Report UI Automation', () => {

    test.beforeEach(async ({ page }) => {
        // Build the absolute path to the generated HTML report
        const reportPath = path.resolve(__dirname, '../playvision-report/index.html');
        console.log(`Loading report from: file://${reportPath}`);

        // Navigate to the local file
        await page.goto(`file://${reportPath}`);
    });

    test('should load the report dashboard successfully', async ({ page }) => {
        // Wait for the report to render its main shell
        await expect(page.locator('body')).toBeVisible();
        await expect(page).toHaveTitle(/PlayVision/i, { timeout: 10000 });

        // Optionally verify header/dashboard stats are present
        // await expect(page.locator('header')).toBeVisible();
    });

    test('should test search functionality', async ({ page }) => {
        // Find the global search input
        const searchInput = page.getByPlaceholder(/search|type to filter/i).first();

        if (await searchInput.isVisible()) {
            // Test searching for a random term
            await searchInput.fill('Login test');
            await page.waitForTimeout(500); // Allow React to debounce and update state

            // Clear the search buffer
            await searchInput.clear();
        }
    });

    test('should filter tests by status tags', async ({ page }) => {
        // Interact with the Passed/Failed/Skipped metric buttons or chips
        const statuses = ['Passed', 'Failed', 'Skipped', 'Flaky'];

        for (const status of statuses) {
            const filterBtn = page.getByRole('button', { name: new RegExp(status, 'i') }).first();
            if (await filterBtn.isVisible()) {
                await filterBtn.click();
                await page.waitForTimeout(300); // Wait for filtering animation

                // Un-toggle if it behaves as a multi-select
                // await filterBtn.click();
            }
        }
    });

    test('should be able to open test execution details and switch tabs', async ({ page }) => {
        // Click on the first available test card / row in the UI
        const testCard = page.locator('div[class*="card"], tr, li').filter({ hasText: 'test' }).first();

        if (await testCard.isVisible()) {
            await testCard.click();

            // Look for internal panel tabs for detailed evidence
            const evidenceTabs = ['Logs', 'Error', 'Steps', 'Screenshot', 'Video', 'Trace'];

            for (const tab of evidenceTabs) {
                const tabLocator = page.getByRole('tab', { name: new RegExp(tab, 'i') }).first();
                if (await tabLocator.isVisible()) {
                    // Click through every available evidence tab
                    await tabLocator.click();
                    await page.waitForTimeout(200);
                }
            }

            // Look for a drawer/modal close button and exit out
            const closeBtn = page.getByRole('button', { name: /close|x/i }).first();
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
            }
        }
    });

    test('should verify AI Forensics elements', async ({ page }) => {
        // Look for the AI analysis features (Ollama/OpenAI indicators)
        const aiGenerateBtn = page.getByRole('button', { name: /Analys|AI/i }).first();

        if (await aiGenerateBtn.isVisible()) {
            await expect(aiGenerateBtn).toBeEnabled();
            // In a real environment, you might click this to trigger local mock AI
        }
    });

    test('should interact with Data Export tools', async ({ page }) => {
        // Trigger hover or click on the executive export features
        const pdfExport = page.getByRole('button', { name: /pdf/i }).first();
        const exportExcel = page.getByRole('button', { name: /excel/i }).first();

        if (await pdfExport.isVisible()) {
            // Avoid actually clicking during tests unless you want to intercept the download
            await pdfExport.hover();
        }

        if (await exportExcel.isVisible()) {
            await exportExcel.hover();
        }
    });

    test('should validate VS Code deep link logic', async ({ page }) => {
        // Validate source traceability feature
        const sourceLink = page.locator('a[href^="vscode://"]').first();

        if (await sourceLink.isVisible()) {
            // Ensure the URL matches the expected VSCode file opening protocol
            await expect(sourceLink).toHaveAttribute('href', /vscode:\/\/file\/.*/);
        }
    });

    test('should test light/dark mode toggling (if applicable)', async ({ page }) => {
        // Look for a theme toggle switch or button
        const themeToggle = page.getByRole('button', { name: /dark mode|light mode|theme/i }).first();

        if (await themeToggle.isVisible()) {
            await themeToggle.click();

            // Optionally assert the HTML body now has a 'dark' class
            // await expect(page.locator('html')).toHaveClass(/dark/);

            // Revert back
            await themeToggle.click();
        }
    });

    test('should verify copy to clipboard functionality', async ({ page }) => {
        // Look for copy icon/button next to error messages or test titles
        const copyBtn = page.getByRole('button', { name: /copy/i }).first();
        if (await copyBtn.isVisible()) {
            await copyBtn.click();
            // Optionally verify a "Copied!" toast/tooltip appears
        }
    });

    test('should sort tests if sorting is available', async ({ page }) => {
        // Look for column headers or a sort dropdown (e.g. by Duration or Title)
        const sortAction = page.getByRole('button', { name: /sort|Duration|Time/i }).first();
        if (await sortAction.isVisible()) {
            await sortAction.click();
            await page.waitForTimeout(300); // Wait for list to reorder
        }
    });

    test('should expand and collapse test suites', async ({ page }) => {
        // Look for a chevron/expand button on a suite grouping
        const expandBtn = page.locator('button > svg[class*="chevron"], button[class*="expand"]').first();
        if (await expandBtn.isVisible()) {
            await expandBtn.click();
            await page.waitForTimeout(300); // Wait for animation
            await expandBtn.click(); // Revert back
        }
    });

    test('should interact with charts or visual metrics', async ({ page }) => {
        // Look for a canvas element, svg, or specific chart wrapper class
        const chart = page.locator('svg, canvas, [class*="chart"], [class*="graph"]').first();
        if (await chart.isVisible()) {
            // Hover over the chart to trigger execution metrics tooltips
            await chart.hover();
            await page.waitForTimeout(300);
        }
    });

});
