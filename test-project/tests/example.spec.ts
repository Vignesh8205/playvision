import { test, expect } from '@playwright/test';

test.describe('Sample Test Suite', () => {
    test('should pass - basic navigation', async ({ page }) => {
        await page.goto('https://playwright.dev');
        await expect(page).toHaveTitle(/Playwright/);
    });

    test('should pass - click and navigate', async ({ page }) => {
        await page.goto('https://playwright.dev');
        await page.getByRole('link', { name: 'Get started' }).click();
        await expect(page).toHaveURL(/.*intro/);
    });

    test('should fail - locator not found', async ({ page }) => {
        await page.goto('https://playwright.dev');
        // This will fail - element doesn't exist
        await page.getByRole('button', { name: 'NonExistentButton' }).click();
    });

    test('should fail - assertion error', async ({ page }) => {
        await page.goto('https://playwright.dev');
        // This will fail - wrong title
        await expect(page).toHaveTitle('Wrong Title');
    });

    test('should fail - timeout error', async ({ page }) => {
        await page.goto('https://playwright.dev');
        // This will timeout
        await page.waitForSelector('.non-existent-element', { timeout: 2000 });
    });

    test.skip('should be skipped', async ({ page }) => {
        await page.goto('https://playwright.dev');
        await expect(page).toHaveTitle(/Playwright/);
    });
});

test.describe('E-commerce Flow', () => {
    test('should add item to cart', async ({ page }) => {
        await page.goto('https://playwright.dev');
        const title = await page.title();
        expect(title).toContain('Playwright');
    });

    test('should handle checkout', async ({ page }) => {
        await page.goto('https://playwright.dev');
        await page.getByRole('link', { name: 'Docs' }).click();
        await expect(page).toHaveURL(/.*docs/);
    });
});

test.describe('API Tests', () => {
    test('should fetch data successfully', async ({ request }) => {
        const response = await request.get('https://api.github.com/repos/microsoft/playwright');
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.name).toBe('playwright');
    });

    test('should handle API error', async ({ request }) => {
        const response = await request.get('https://api.github.com/repos/nonexistent/repo');
        expect(response.status()).toBe(404);
    });
});
