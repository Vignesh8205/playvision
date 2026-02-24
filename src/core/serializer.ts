import * as fs from 'fs';
import * as path from 'path';
import { TestResult, ReportMetadata } from '../schema/types';
import { IDataSerializer } from './interfaces';

/**
 * Serializes test results and metadata to JSON files
 */
export class DataSerializer implements IDataSerializer {
    private outputFolder: string;

    constructor(outputFolder: string) {
        this.outputFolder = outputFolder;
    }

    async writeResults(results: TestResult[], metadata: ReportMetadata): Promise<void> {
        // Ensure output folder exists
        if (!fs.existsSync(this.outputFolder)) {
            fs.mkdirSync(this.outputFolder, { recursive: true });
        }

        const dataFolder = path.join(this.outputFolder, 'data');
        if (!fs.existsSync(dataFolder)) {
            fs.mkdirSync(dataFolder, { recursive: true });
        }

        // Write results
        const resultsPath = path.join(dataFolder, 'results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

        // Write metadata
        const metadataPath = path.join(this.outputFolder, 'metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        console.log(`📝 Saved ${results.length} test results to ${resultsPath}`);
    }

    async readResults(): Promise<{ results: TestResult[]; metadata: ReportMetadata }> {
        const resultsPath = path.join(this.outputFolder, 'data', 'results.json');
        const metadataPath = path.join(this.outputFolder, 'metadata.json');

        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

        return { results, metadata };
    }
}
