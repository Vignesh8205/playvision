import * as fs from 'fs';
import * as path from 'path';
import { TestResult, ReportMetadata } from '../schema/types';
import { IHTMLRenderer } from './interfaces';

/**
 * Modern React-Based HTML Renderer
 * 
 * This renderer uses a pre-built React SPA as a shell.
 * It injects the test data directly into the shell for maximum performance
 * and a premium, modern UI experience.
 */
export class HTMLRenderer implements IHTMLRenderer {
    private outputFolder: string;
    private distPath: string;

    constructor(outputFolder: string) {
        this.outputFolder = outputFolder;
        
        // Strategy: Look for the built UI in multiple locations
        // 1. Check relative to current file (works when running from dist, inside NPM package or locally)
        const distCandidate = path.join(__dirname, 'ui', 'index.html');
        // 2. Check in the source directory (works during development, looking 2 levels up from dist/html)
        const projectRoot = path.join(__dirname, '..', '..');
        const srcCandidate = path.join(projectRoot, 'src', 'html', 'report-ui', 'dist', 'index.html');
        
        if (fs.existsSync(distCandidate)) {
            this.distPath = distCandidate;
        } else if (fs.existsSync(srcCandidate)) {
            this.distPath = srcCandidate;
        } else {
            // Default to the intended distribution path
            this.distPath = distCandidate;
        }
    }

    async generate(results: TestResult[], metadata: ReportMetadata): Promise<void> {
        if (!fs.existsSync(this.outputFolder)) {
            fs.mkdirSync(this.outputFolder, { recursive: true });
        }

        // 1. Read the React UI dist asset (The "Shell")
        // If dist doesn't exist yet, we use a fallback or explain the requirement
        let shell: string;
        if (fs.existsSync(this.distPath)) {
            shell = fs.readFileSync(this.distPath, 'utf-8');
        } else {
            console.warn('React build not found. Using fallback template. Please run build in report-ui.');
            shell = this.getFallbackShell();
        }

        // 2. Prepare the data payload
        const dataPayload = {
            results,
            metadata: {
                ...metadata,
                generatedAt: new Date().toISOString()
            }
        };

        // 3. Inject data into the shell
        // We look for the placeholder script tag and replace its content
        const dataInjection = `window.PLAYVISION_DATA = ${JSON.stringify(dataPayload)};`;
        let html = shell.replace(
            /<script id="playvision-data">[\s\S]*?<\/script>/,
            `<script id="playvision-data">${dataInjection}</script>`
        );

        // Remove type="module" crossorigin to allow local file viewing without CORS errors
        // Also polyfill import.meta which is only allowed inside modules
        html = html.replace(/<script type="module" crossorigin[^>]*>/g, '<script>');
        html = html.replace(/\bimport\.meta\b/g, "({url:'',env:{}})");

        // 4. Output the final report
        const outputPath = path.join(this.outputFolder, 'index.html');
        fs.writeFileSync(outputPath, html, 'utf-8');
        
        console.log('Premium React report generated: ' + outputPath);
    }

    private getFallbackShell(): string {
        return `<!DOCTYPE html><html><head><title>PlayVision</title></head>
        <body style="background:#0f1115;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
            <div style="text-align:center">
                <h1 style="color:red">UI Assets Missing</h1>
                <p>Please build the <code>report-ui</code> project to enable the modern React view.</p>
                <p>Run: <code>cd src/html/report-ui && npm install && npm run build</code></p>
                <hr style="border:0;border-top:1px solid #333;margin:20px 0">
                <p style="opacity:0.5">Test Count: ${Math.random()}</p>
            </div>
        </body></html>`;
    }
}
