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
        const start = performance.now();
        if (!fs.existsSync(this.outputFolder)) {
            fs.mkdirSync(this.outputFolder, { recursive: true });
        }

        // 1. Read the React UI dist asset (The "Shell")
        let shell: string;
        if (fs.existsSync(this.distPath)) {
            shell = fs.readFileSync(this.distPath, 'utf-8');
            
            // Critical Integrity Check: Ensure the shell is compiled (no raw tailwind directives)
            if (shell.includes('@tailwind')) {
                console.error('❌ PlayVision Warning: HTML Shell contains UNCOMPILED CSS directives.');
                console.error('   This usually means the PostCSS/Tailwind build failed in the CI/CD pipeline.');
                console.error('   Defaulting to basic styles to prevent a broken experience.');
            }
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

        // 3. Inject data and polyfills into the shell
        // Move polyfills and data into the head so they are available BEFORE the React JS executes.
        const polyfills = '<script>window.global = window; window.process = { env: {} };</script>';
        const dataInjection = `window.PLAYVISION_DATA = ${JSON.stringify(dataPayload)};`;
        const dataScript = `<script id="playvision-data">${dataInjection}</script>`;
        
        // Use a function for replacement to avoid issues with '$' in the JSON data
        let html = shell.replace(
            /<script id="playvision-data">[\s\S]*?<\/script>/,
            () => `${polyfills}${dataScript}`
        );

        // Remove type="module" crossorigin to allow local file viewing without CORS errors
        // Also polyfill import.meta which is only allowed inside modules
        // Robust regex for catching variation in attributes
        html = html.replace(/<script\s+([^>]*?)type=["']module["']([^>]*?)>/gi, '<script $1 $2>');
        html = html.replace(/<script\s+([^>]*?)crossorigin([^>]*?)>/gi, '<script $1 $2>');
        html = html.replace(/\bimport\.meta\b/g, "({url:'',env:{}})");

        // Critical Fix: Remove invalid attributes from inlined <style> tags that cause browsers to ignore them
        // vite-plugin-singlefile sometimes adds rel="stylesheet" or crossorigin to <style> tags
        html = html.replace(/<style\s+([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi, '<style $1 $2>');
        html = html.replace(/<style\s+([^>]*?)crossorigin([^>]*?)>/gi, '<style $1 $2>');

        // Cleanup potential double spaces or leading/trailing spaces in tags
        html = html.replace(/<(style|script)\s+>/gi, '<$1>');
        html = html.replace(/\s+>/g, '>');
        html = html.replace(/\s{2,}/g, ' ');

        // 4. Output the final report
        const outputPath = path.join(this.outputFolder, 'index.html');
        fs.writeFileSync(outputPath, html, 'utf-8');
        
        console.log(`Premium React report generated in ${Math.round(performance.now() - start)}ms: ${outputPath}`);
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
