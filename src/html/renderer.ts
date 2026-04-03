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
            
            // Integrity Check: Ensure the shell is compiled (no raw tailwind directives)
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

        // 3. Inject data and polyfills into the shell.
        //    Use a replacement function (not a string) to prevent '$' in JSON from being
        //    interpreted as a regex back-reference.
        const polyfills = '<script>window.global = window; window.process = { env: {} };</script>';
        const dataInjection = `window.PLAYVISION_DATA = ${JSON.stringify(dataPayload)};`;
        const dataScript = `<script id="playvision-data">${dataInjection}</script>`;
        
        let html = shell.replace(
            /<script id="playvision-data">[\s\S]*?<\/script>/,
            () => `${polyfills}${dataScript}`
        );

        // 4. Safe attribute cleanup on <script> opening tags ONLY.
        //    Strategy: use a replace callback so we process only the attribute string of each
        //    opening tag — never the JavaScript content between <script> and </script>.
        //    This is critical: NEVER use a global \s{2,} or \s+> replacement on the full HTML
        //    because that destroys minified CSS, Base64 data URIs, and other sensitive content.
        //
        //    We remove:
        //      - type="module"  → makes scripts execute as classic scripts (enables local file viewing)
        //      - crossorigin    → removes CORS restriction on local file access
        html = html.replace(/<script(\s[^>]*)>/gi, (_match: string, attrs: string) => {
            let cleaned = attrs
                .replace(/\s*type\s*=\s*["']module["']/gi, '')
                .replace(/\s*crossorigin(?:\s*=\s*["'][^"']*["'])?/gi, '');
            return `<script${cleaned}>`;
        });

        // 5. Polyfill import.meta.
        //    import.meta is only valid inside ES modules; we need to replace it for classic scripts.
        html = html.replace(/\bimport\.meta\b/g, "({url:'',env:{}})");

        // 6. Safe attribute cleanup on <style> opening tags ONLY.
        //    vite-plugin-singlefile sometimes injects rel="stylesheet" or crossorigin into <style> tags.
        //    Browsers silently IGNORE <style> tags with invalid attributes, which is why the design
        //    disappears entirely. We strip these bad attributes here.
        html = html.replace(/<style(\s[^>]*)>/gi, (_match: string, attrs: string) => {
            let cleaned = attrs
                .replace(/\s*rel\s*=\s*["']stylesheet["']/gi, '')
                .replace(/\s*crossorigin(?:\s*=\s*["'][^"']*["'])?/gi, '');
            cleaned = cleaned.trim();
            // Return bare <style> if all attributes were removed, else preserve remaining attributes
            return cleaned ? `<style ${cleaned}>` : '<style>';
        });

        // 7. Output the final report
        const outputPath = path.join(this.outputFolder, 'index.html');
        fs.writeFileSync(outputPath, html, 'utf-8');
        
        console.log(`✅ PlayVision report generated in ${Math.round(performance.now() - start)}ms → ${outputPath}`);
    }


    private getFallbackShell(): string {
        return `<!DOCTYPE html><html><head><title>PlayVision</title></head>
        <body style="background:#0f1115;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
            <div style="text-align:center">
                <h1 style="color:red">UI Assets Missing</h1>
                <p>Please build the <code>report-ui</code> project to enable the modern React view.</p>
                <p>Run: <code>cd src/html/report-ui &amp;&amp; npm install &amp;&amp; npm run build</code></p>
                <hr style="border:0;border-top:1px solid #333;margin:20px 0">
            </div>
        </body></html>`;
    }
}
