import type { TestCase, TestResult as PWTestResult } from '@playwright/test/reporter';
import { IAssetCollector } from './interfaces';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeFilename } from '../utils/helpers';

/**
 * Collects and manages test assets (screenshots, videos, traces)
 */
export class AssetCollector implements IAssetCollector {
    private outputFolder: string;
    private assetsFolder: string;

    constructor(outputFolder: string) {
        this.outputFolder = outputFolder;
        this.assetsFolder = path.join(outputFolder, 'assets');
    }

    initialize(): void {
        // Create output directories
        const dirs = [
            this.assetsFolder,
            path.join(this.assetsFolder, 'screenshots'),
            path.join(this.assetsFolder, 'videos'),
            path.join(this.assetsFolder, 'traces')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async collectAssets(test: TestCase, result: PWTestResult): Promise<void> {
        const attachments = result.attachments;

        for (let index = 0; index < attachments.length; index++) {
            const attachment = attachments[index];
            if (!attachment.path) continue;

            const ext = path.extname(attachment.path);
            const testId = sanitizeFilename(test.title);

            let targetFolder = '';
            if (attachment.contentType.includes('image')) {
                targetFolder = 'screenshots';
            } else if (attachment.contentType.includes('video')) {
                targetFolder = 'videos';
            } else {
                // Default to traces for all other attachments (traces, text files, etc.)
                targetFolder = 'traces';
            }

            if (targetFolder) {
                const targetPath = path.join(
                    this.assetsFolder,
                    targetFolder,
                    `${testId}-${index}${ext}`
                );

                try {
                    // Copy file to assets folder
                    if (fs.existsSync(attachment.path)) {
                        fs.copyFileSync(attachment.path, targetPath);
                    }
                } catch (error) {
                    console.warn(`Failed to copy asset: ${attachment.path}`, error);
                }
            }
        }
    }

    getAssetPath(testId: string, assetType: string): string {
        return path.join(this.assetsFolder, assetType, testId);
    }
}
