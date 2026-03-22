import { HTMLRenderer } from '../src/html/renderer';
import { TestResult, ReportMetadata } from '../src/schema/types';

const now = Date.now();

const mockMetadata: ReportMetadata = {
    totalTests: 25,
    passed: 15,
    failed: 6,
    skipped: 2,
    flaky: 2,
    startTime: now - 300000,
    endTime: now,
    duration: 300000,
    workers: 4
};

const mockResults: TestResult[] = [
    {
        testId: 'video-001',
        title: 'Video Stream Performance on Mobile',
        suite: 'Performance Metrics',
        status: 'failed',
        startTime: now - 280000,
        endTime: now - 250000,
        duration: 30000,
        retries: 0,
        steps: [
            { name: 'Launch Mobile Emulator', category: 'setup', startTime: now - 280000, duration: 5000, status: 'passed' },
            { name: 'Load Video Hub', category: 'action', startTime: now - 275000, duration: 2000, status: 'passed' },
            { name: 'Play 4K Stream', category: 'action', startTime: now - 273000, duration: 23000, status: 'failed', error: 'Frame rate dropped below 24fps' }
        ],
        attachments: [
            {
                name: 'Performance Graph (Dropped Frames)',
                type: 'screenshot',
                path: 'https://images.unsplash.com/photo-1551288049-bbbda536339a?q=80&w=2070&auto=format&fit=crop',
                contentType: 'image/jpeg'
            },
            {
                name: 'Mobile Viewport Recording',
                type: 'video',
                path: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                contentType: 'video/mp4'
            },
            {
                name: 'System Resource Usage',
                type: 'screenshot',
                path: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
                contentType: 'image/jpeg'
            }
        ],
        error: {
            message: 'Error: Performance degradation detected.\nThreshold: 30fps\nActual: 18fps',
            stack: 'Error: Performance degradation detected\n    at PerformanceMonitor.verifyFrameRate (C:/Users/Admin/playvision/tests/perf.spec.ts:45:12)',
            aiAnalysis: {
                category: 'Resource Bottleneck',
                confidence: 0.98,
                rootCause: 'High CPU utilization caused by simultaneous 4K decoding and animation layer rendering on the Chromium mobile emulator.',
                suggestion: '1. Disable hardware acceleration overlays for mobile tests.\n2. Use 1080p source video for performance regression benchmarks.',
                fixExample: 'await browser.newContext({ deviceScaleFactor: 1 });',
                severity: 'medium',
                impact: 'Mobile users may experience stuttering during video playback.',
                model: 'gemini-2.0-pro-exp',
                analyzedAt: now
            }
        }
    },
    {
        testId: 'auth-001',
        title: 'User can sign in with valid credentials',
        suite: 'Authentication',
        status: 'passed',
        startTime: now - 110000,
        endTime: now - 105000,
        duration: 5000,
        retries: 0,
        steps: [
            { name: 'Open login page', category: 'pw:api', startTime: now - 110000, duration: 1200, status: 'passed' },
            { name: 'Verify Login UI', category: 'expect', startTime: now - 108800, duration: 500, status: 'passed' }
        ],
        attachments: [
            {
                name: 'Login Page Initial State',
                type: 'screenshot',
                path: 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?q=80&w=2070&auto=format&fit=crop',
                contentType: 'image/jpeg'
            }
        ]
    },
    {
        testId: 'checkout-001',
        title: 'Checkout fails with expired card',
        suite: 'Checkout Flow',
        status: 'failed',
        startTime: now - 100000,
        endTime: now - 90000,
        duration: 10000,
        retries: 1,
        attachments: [
            {
                name: 'Payment Failure Screen',
                type: 'screenshot',
                path: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=2029&auto=format&fit=crop',
                contentType: 'image/jpeg'
            },
            {
                name: 'Checkout Session Recording',
                type: 'video',
                path: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                contentType: 'video/mp4'
            }
        ],
        error: {
            message: 'Error: timeout: 4000ms\nExpected: payment success message',
            stack: 'Error at checkout.spec.ts:145:22',
            aiAnalysis: {
                category: 'Network Failure',
                confidence: 0.95,
                rootCause: 'External payment API timed out.',
                suggestion: 'Increase timeout to 10s.',
                impact: 'Critical: Hard block for all checkouts.'
            }
        },
        steps: []
    }
];

// Add bunch of passed tests
for (let i = 0; i < 15; i++) {
    mockResults.push({
        testId: `pass-${i}`,
        title: `Smoke Test - Module ${i}`,
        suite: 'Regression',
        status: 'passed',
        startTime: now,
        endTime: now,
        duration: Math.random() * 2000,
        retries: 0,
        steps: [],
        attachments: i === 0 ? [
            {
                name: 'Health Check Success',
                type: 'screenshot',
                path: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=2070&auto=format&fit=crop',
                contentType: 'image/jpeg'
            }
        ] : []
    });
}

const mockFolder = './mock-report-output';
const renderer = new HTMLRenderer(mockFolder);
const { ExportManager } = require('../src/core/export-manager');
const exportManager = new ExportManager(mockFolder, { exportPdf: true, exportExcel: true } as any);

renderer.generate(mockResults, mockMetadata).then(async () => {
    console.log(`Mock report successfully generated at ${mockFolder}/index.html`);
    await exportManager.export(mockResults, mockMetadata);
    console.log('Export tasks completed.');
}).catch(err => {
    console.error('Failed to generate mock report', err);
});
