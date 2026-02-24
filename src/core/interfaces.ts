import { TestResult, ReportMetadata } from '../schema/types';

/**
 * Interface for data serialization
 */
export interface IDataSerializer {
    /**
     * Write test results and metadata to disk
     */
    writeResults(results: TestResult[], metadata: ReportMetadata): Promise<void>;

    /**
     * Read test results from disk
     */
    readResults?(): Promise<{ results: TestResult[]; metadata: ReportMetadata }>;
}

/**
 * Interface for report rendering
 */
export interface IReportRenderer {
    /**
     * Generate report from test results
     */
    generate(results: TestResult[], metadata: ReportMetadata): Promise<void>;
}
