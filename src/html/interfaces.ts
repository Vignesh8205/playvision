import { TestResult, ReportMetadata } from '../schema/types';

/**
 * Interface for HTML rendering
 */
export interface IHTMLRenderer {
    /**
     * Generate HTML report
     */
    generate(results: TestResult[], metadata: ReportMetadata): Promise<void>;
}

/**
 * Interface for template rendering
 */
export interface ITemplateRenderer {
    /**
     * Render a template with data
     */
    render(templateName: string, data: any): string;
}
