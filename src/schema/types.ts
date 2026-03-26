/**
 * PlayVision Reporter Configuration
 */
export interface PlayVisionConfig {
    /** Output folder for the report */
    outputFolder: string;
    /** Enable screenshot capture */
    screenshots: boolean;
    /** Video recording mode */
    videos: 'on' | 'off' | 'retain-on-failure';
    /** Enable AI error analysis */
    aiAnalysis: boolean;
    /** AI analysis mode */
    aiMode?: 'basic' | 'smart' | 'premium';
    /** Enable PDF Executive Summary export */
    exportPdf?: boolean;
    /** Enable Excel failure data export */
    exportExcel?: boolean;
}

/**
 * Individual test result
 */
export interface TestResult {
    testId: string;
    title: string;
    suite: string;
    status: 'passed' | 'failed' | 'skipped' | 'flaky' | 'timedOut';
    startTime: number;
    endTime: number;
    duration: number;
    retries: number;
    steps: TestStep[];
    attachments: Attachment[];
    error?: ErrorDetails;
    /** Source location of the test in the spec file */
    sourceLocation?: {
        /** Absolute path to the spec file */
        file: string;
        /** Line number where the test is defined */
        line: number;
        /** Basename of the spec file, e.g. login.spec.ts */
        fileName: string;
        /** Path relative to project root, e.g. tests/auth/login.spec.ts */
        relativePath: string;
    };
}

/**
 * Test step information
 */
export interface TestStep {
    name: string;
    category: string;
    startTime: number;
    duration: number;
    status: 'passed' | 'failed' | 'skipped';
    error?: string;
}

/**
 * Test attachment (screenshot, video, trace)
 */
export interface Attachment {
    name: string;
    type: 'screenshot' | 'video' | 'trace';
    path: string;
    contentType: string;
    base64?: string;
}

/**
 * Error details with AI analysis
 */
export interface ErrorDetails {
    message: string;
    stack: string;
    aiAnalysis?: AIAnalysis;
    /** Exact line number where error occurred */
    lineNumber?: number;
    /** Exact column number where error occurred */
    columnNumber?: number;
    /** Path to the spec file */
    specFile?: string;
    /** The specific test step name that failed */
    failedStepName?: string;
}

/**
 * AI error analysis result
 */
export interface AIAnalysis {
    /** Primary error category */
    category: string;
    /** Confidence score 0–1 */
    confidence: number;
    /** Detailed root cause explanation */
    rootCause: string;
    /** Step-by-step fix suggestion */
    suggestion: string;
    /** Optional code fix example */
    fixExample?: string;
    /** Alternative category classifications */
    alternatives?: { category: string; confidence: number }[];
    /** Severity level of the failure */
    severity?: 'critical' | 'high' | 'medium' | 'low';
    /** Business/functional impact of this failure */
    impact?: string;
    /** How to prevent this class of error in the future */
    prevention?: string;
    /** Rough estimate of time to fix */
    estimatedFixTime?: string;
    /** Searchable tags for this error type */
    tags?: string[];
    /** Which AI model performed the analysis */
    model?: string;
    /** Timestamp of the analysis */
    analyzedAt?: number;
    /** AI-based suggestions to improve the script (selectors, waits, assertions) */
    scriptImprovements?: {
        type: 'selector' | 'wait' | 'assertion' | 'other';
        current: string;
        suggested: string;
        reason: string;
    }[];
    /** Possible flakiness detection and stability improvements */
    flakinessAnalysis?: {
        isLikelyFlaky: boolean;
        reason: string;
        recommendation: string;
    };
}

/**
 * Overall report metadata
 */
export interface ReportMetadata {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    duration: number;
    workers: number;
    startTime: number;
    endTime: number;
}
