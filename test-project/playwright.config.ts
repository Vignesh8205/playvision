import { defineConfig, devices } from '@playwright/test';
import { PlayVisionConfig } from 'playvision-report';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['playvision-report', {//../dist/index.js
            outputFolder: 'playvision-report',
            screenshots: true,
            videos: 'retain-on-failure',
            aiAnalysis: true,
            aiMode: 'premium' // Ollama with OpenAI fallback
        } as PlayVisionConfig] 
    ],
    use: {
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
