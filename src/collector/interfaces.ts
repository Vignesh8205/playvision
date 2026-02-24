import { TestCase, TestResult as PWTestResult } from '@playwright/test/reporter';
import { TestResult } from '../schema/types';

/**
 * Interface for collecting test events
 */
export interface IEventCollector {
    /**
     * Start tracking a test
     */
    startTest(test: TestCase): void;

    /**
     * End tracking a test and finalize data
     */
    endTest(test: TestCase, result: PWTestResult): Promise<void>;

    /**
     * Get all collected test results
     */
    getResults(): TestResult[];

    /**
     * Clear all collected data
     */
    clear?(): void;
}

/**
 * Interface for collecting test assets (screenshots, videos, traces)
 */
export interface IAssetCollector {
    /**
     * Initialize asset storage
     */
    initialize(): void;

    /**
     * Collect assets for a test
     */
    collectAssets(test: TestCase, result: PWTestResult): Promise<void>;

    /**
     * Get asset path for a test
     */
    getAssetPath?(testId: string, assetType: string): string;
}
