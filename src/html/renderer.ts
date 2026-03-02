import * as fs from 'fs';
import * as path from 'path';
import { TestResult, ReportMetadata } from '../schema/types';
import { IHTMLRenderer } from './interfaces';

/**
 * Generates a single self-contained HTML report for PlayVision
 */
export class HTMLRenderer implements IHTMLRenderer {
    private outputFolder: string;

    constructor(outputFolder: string) {
        this.outputFolder = outputFolder;
    }

    async generate(results: TestResult[], metadata: ReportMetadata): Promise<void> {
        if (!fs.existsSync(this.outputFolder)) {
            fs.mkdirSync(this.outputFolder, { recursive: true });
        }
        this.writeSingleHTML(results, metadata);
    }

    private writeSingleHTML(results: TestResult[], metadata: ReportMetadata): void {
        const date = new Date(metadata.startTime);
        const dateStr = date.toLocaleDateString();
        const dateTimeStr = date.toLocaleString();
        const durationSec = (metadata.duration / 1000).toFixed(2);
        const passRate = metadata.totalTests > 0
            ? ((metadata.passed / metadata.totalTests) * 100).toFixed(1)
            : '0.0';
        const aiCount = results.filter(r => r.error?.aiAnalysis).length;
        const failCount = results.filter(r => r.status === 'failed' || r.status === 'timedOut').length;
        const flakyCount = results.filter(r => r.status === 'flaky').length;
        const ringCirc = 2 * Math.PI * 62;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PlayVision AI Report — ${dateStr}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#080c14;--surface:#0e1420;--surface2:#141c2a;--surface3:#1a2332;--surface4:#202c3e;
  --border:#1e2d42;--border2:#2a3d56;--border3:#344d6a;
  --text:#e8edf5;--text2:#8fa3bc;--text3:#5d7a99;--text4:#3d5575;
  --accent:#7c3aed;--accent2:#a855f7;--accent3:#c084fc;--accent-glow:rgba(124,58,237,0.4);
  --green:#22c55e;--green2:#16a34a;--green-dim:rgba(34,197,94,0.1);--green-glow:rgba(34,197,94,0.3);
  --red:#ef4444;--red2:#dc2626;--red-dim:rgba(239,68,68,0.1);--red-glow:rgba(239,68,68,0.3);
  --yellow:#f59e0b;--yellow-dim:rgba(245,158,11,0.1);
  --orange:#f97316;--orange-dim:rgba(249,115,22,0.1);
  --blue:#3b82f6;--blue-dim:rgba(59,130,246,0.1);
  --cyan:#06b6d4;--teal:#14b8a6;
  --ai-grad:linear-gradient(135deg,#6d28d9,#7c3aed,#9333ea,#a855f7);
  --ai-glow:0 0 40px rgba(124,58,237,0.5),0 0 80px rgba(168,85,247,0.2);
  --r:10px;--rl:16px;--rx:24px;
  --font:'Inter',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;
  --t:0.22s cubic-bezier(0.4,0,0.2,1);
  --sh:0 4px 24px rgba(0,0,0,0.4);
  --sh2:0 8px 48px rgba(0,0,0,0.5);
}
body.light{
  --bg:#f0f4f8;--surface:#fff;--surface2:#f8fafc;--surface3:#eef2f7;--surface4:#e4eaf2;
  --border:#dde3ed;--border2:#c8d2e0;--border3:#b0bfd0;
  --text:#0c1a2e;--text2:#4a6080;--text3:#7a96b0;--text4:#a0b5c8;
  --accent-glow:rgba(124,58,237,0.2);
  --green-dim:rgba(34,197,94,0.08);--red-dim:rgba(239,68,68,0.08);
  --sh:0 4px 16px rgba(0,0,0,0.08);--sh2:0 8px 32px rgba(0,0,0,0.12);
}
html{scroll-behavior:smooth}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6;transition:background var(--t),color var(--t)}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:var(--accent)}
.app{max-width:1400px;margin:0 auto;padding:20px 24px}

/* â•â•â• HEADER â•â•â• */
.hdr{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:var(--rx);padding:32px 40px;margin-bottom:20px;overflow:hidden}
.hdr::before{content:'';position:absolute;inset:0;background:
  radial-gradient(ellipse 80% 70% at 5% 50%,rgba(124,58,237,0.18),transparent 60%),
  radial-gradient(ellipse 40% 60% at 95% 10%,rgba(168,85,247,0.1),transparent 60%),
  radial-gradient(ellipse 60% 40% at 50% 100%,rgba(6,182,212,0.05),transparent 60%);
  pointer-events:none}
.hdr::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#7c3aed 30%,#a855f7 50%,#c084fc 70%,transparent);pointer-events:none}
.hdr-inner{position:relative;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:18px}
.brand-icon{width:58px;height:58px;border-radius:16px;background:var(--ai-grad);display:flex;align-items:center;justify-content:center;font-size:1.8em;box-shadow:var(--ai-glow);flex-shrink:0;position:relative}
.brand-icon::after{content:'AI';position:absolute;bottom:-6px;right:-6px;background:#7c3aed;color:#fff;font-size:0.28em;font-weight:800;padding:2px 5px;border-radius:4px;letter-spacing:0.5px;border:2px solid var(--bg)}
.brand-name{font-size:2em;font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg,#fff 0%,#e2d9f3 30%,#c084fc 60%,#a855f7 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.brand-sub{color:var(--text2);font-size:0.82em;margin-top:3px;display:flex;align-items:center;gap:8px}
.brand-sub-dot{width:5px;height:5px;border-radius:50%;background:var(--accent2)}
.hdr-right{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.chip{display:flex;align-items:center;gap:7px;background:var(--surface2);border:1px solid var(--border);border-radius:50px;padding:7px 14px;font-size:0.8em;font-weight:500;color:var(--text2);transition:all var(--t)}
.chip:hover{border-color:var(--accent);color:var(--text);transform:translateY(-1px)}
.chip svg{width:12px;height:12px;opacity:0.65}
.theme-btn{display:flex;align-items:center;gap:7px;padding:7px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:50px;cursor:pointer;font-size:0.8em;font-weight:500;color:var(--text2);transition:all var(--t)}
.theme-btn:hover{border-color:var(--accent);color:var(--text)}
.theme-btn svg{width:12px;height:12px}

/* â•â•â• KPI ROW â•â•â• */
.kpi-row{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:20px}
@media(max-width:1100px){.kpi-row{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.kpi-row{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:18px 16px;position:relative;overflow:hidden;transition:all var(--t);cursor:pointer}
.kpi::before{content:'';position:absolute;bottom:0;left:0;right:0;height:60%;background:linear-gradient(to top,rgba(0,0,0,0.15),transparent);pointer-events:none}
.kpi:hover{transform:translateY(-4px);box-shadow:var(--sh2);border-color:var(--border2)}
.kpi-bar{position:absolute;top:0;left:0;right:0;height:3px;border-radius:3px 3px 0 0}
.kpi-icon{font-size:1.4em;margin-bottom:8px;display:block}
.kpi-val{font-size:2.1em;font-weight:900;line-height:1;letter-spacing:-2px}
.kpi-lbl{font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-top:6px}
.kpi-trend{font-size:0.7em;color:var(--text3);margin-top:3px}
.kpi.total .kpi-val{color:#a78bfa}.kpi.total .kpi-bar{background:linear-gradient(90deg,#6d28d9,#a855f7)}
.kpi.passed .kpi-val{color:#22c55e}.kpi.passed .kpi-bar{background:linear-gradient(90deg,#16a34a,#4ade80)}
.kpi.failed .kpi-val{color:#ef4444}.kpi.failed .kpi-bar{background:linear-gradient(90deg,#b91c1c,#f87171)}
.kpi.skipped .kpi-val{color:#6b7280}.kpi.skipped .kpi-bar{background:linear-gradient(90deg,#374151,#9ca3af)}
.kpi.flaky .kpi-val{color:#f97316}.kpi.flaky .kpi-bar{background:linear-gradient(90deg,#c2410c,#fb923c)}
.kpi.ai .kpi-val{color:#c084fc}.kpi.ai .kpi-bar{background:var(--ai-grad)}

/* â•â•â• DASHBOARD ROW â•â•â• */
.dash-row{display:grid;grid-template-columns:1fr 1fr 260px;gap:14px;margin-bottom:20px}
@media(max-width:1000px){.dash-row{grid-template-columns:1fr 1fr}}
@media(max-width:640px){.dash-row{grid-template-columns:1fr}}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:22px}
.card-title{font-size:0.72em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.card-title::after{content:'';flex:1;height:1px;background:var(--border)}

/* Ring */
.ring-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.ring-wrap{position:relative;width:150px;height:150px}
.ring-svg{transform:rotate(-90deg);overflow:visible}
.ring-track{fill:none;stroke:var(--surface3);stroke-width:14}
.ring-fill{fill:none;stroke-width:14;stroke-linecap:round;transition:stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)}
.ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring-pct{font-size:1.8em;font-weight:900;letter-spacing:-2px;color:#22c55e}
.ring-lbl{font-size:0.62em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3)}
.ring-legend{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
.rleg{display:flex;align-items:center;gap:5px;font-size:0.75em;color:var(--text2)}
.rleg-dot{width:7px;height:7px;border-radius:50%}

/* Suite bars */
.suite-row{margin-bottom:12px}
.suite-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-size:0.84em;font-weight:500;color:var(--text)}
.suite-hd span:last-child{font-size:0.78em;color:var(--text3)}
.suite-bar{height:5px;background:var(--surface3);border-radius:3px;overflow:hidden}
.suite-fill{height:100%;border-radius:3px;transition:width 1.2s cubic-bezier(0.4,0,0.2,1)}

/* Error categories */
.cat-dist{display:flex;flex-direction:column;gap:8px}
.cat-row2{display:flex;align-items:center;gap:8px}
.cat-name2{font-size:0.75em;color:var(--text2);width:120px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cat-bar2{flex:1;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden}
.cat-fill2{height:100%;border-radius:3px;background:linear-gradient(90deg,#7c3aed,#c084fc)}
.cat-cnt2{font-size:0.72em;color:var(--text3);width:20px;text-align:right;flex-shrink:0}

/* â•â•â• CONTROLS â•â•â• */
.controls{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:12px 16px;margin-bottom:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.sbox{flex:1;min-width:200px;position:relative}
.sbox svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--text3);pointer-events:none}
.sbox input{width:100%;padding:8px 12px 8px 34px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);color:var(--text);font-family:var(--font);font-size:0.85em;transition:all var(--t)}
.sbox input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.sbox input::placeholder{color:var(--text4)}
select{padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);color:var(--text);font-family:var(--font);font-size:0.85em;cursor:pointer;transition:all var(--t)}
select:focus{outline:none;border-color:var(--accent)}
select:hover{border-color:var(--border2)}
.res-count{font-size:0.78em;color:var(--text3);white-space:nowrap;padding:0 4px}
.sort-btn{display:flex;align-items:center;gap:5px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);cursor:pointer;font-size:0.78em;font-weight:600;color:var(--text2);transition:all var(--t);white-space:nowrap}
.sort-btn:hover{border-color:var(--border2);color:var(--text)}
.sort-btn.active{border-color:var(--accent);color:var(--accent2);background:rgba(124,58,237,0.08)}

/* â•â•â• TEST LIST â•â•â• */
.test-list{display:flex;flex-direction:column;gap:10px}
.empty{text-align:center;padding:60px;color:var(--text2)}
.empty-icon{font-size:3em;margin-bottom:12px}

/* â•â•â• TEST CARD â•â•â• */
.tc{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);cursor:pointer;display:flex;align-items:stretch;transition:all var(--t);position:relative;overflow:hidden}
.tc:hover{transform:translateY(-2px);box-shadow:var(--sh2);border-color:var(--border2)}
.tc.failed:hover{border-color:rgba(239,68,68,0.5)}
.tc.passed:hover{border-color:rgba(34,197,94,0.4)}
.tc-stripe{width:4px;border-radius:0 0 0 0;flex-shrink:0;align-self:stretch;margin-right:0}
.tc.passed .tc-stripe{background:linear-gradient(180deg,#22c55e,#16a34a)}
.tc.failed .tc-stripe{background:linear-gradient(180deg,#ef4444,#dc2626)}
.tc.timedOut .tc-stripe{background:linear-gradient(180deg,#f59e0b,#d97706)}
.tc.skipped .tc-stripe{background:linear-gradient(180deg,#6b7280,#4b5563)}
.tc.flaky .tc-stripe{background:linear-gradient(180deg,#f97316,#ea580c)}
.tc-body{flex:1;min-width:0;padding:14px 16px}
.tc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
.tc-title{font-size:0.93em;font-weight:600;color:var(--text);line-height:1.4}
.tc-right{display:flex;align-items:center;gap:6px;flex-shrink:0}
.sbadge{padding:3px 10px;border-radius:50px;font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap}
.sbadge.passed{background:var(--green-dim);color:var(--green);border:1px solid rgba(34,197,94,0.25)}
.sbadge.failed{background:var(--red-dim);color:var(--red);border:1px solid rgba(239,68,68,0.25)}
.sbadge.timedOut{background:var(--yellow-dim);color:var(--yellow);border:1px solid rgba(245,158,11,0.25)}
.sbadge.skipped{background:rgba(107,114,128,0.08);color:#6b7280;border:1px solid rgba(107,114,128,0.2)}
.sbadge.flaky{background:var(--orange-dim);color:var(--orange);border:1px solid rgba(249,115,22,0.25)}
.ai-pill{display:flex;align-items:center;gap:4px;padding:2px 8px;border-radius:50px;background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(168,85,247,0.12));border:1px solid rgba(168,85,247,0.35);font-size:0.66em;font-weight:700;color:#c084fc;letter-spacing:0.5px;white-space:nowrap}
.tc-meta{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.mc{display:flex;align-items:center;gap:5px;font-size:0.77em;color:var(--text2)}
.mc svg{width:11px;height:11px;opacity:0.5}

/* Error Forensics inline card */
.tc-forensics{margin-top:8px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.forensics-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.f-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;font-size:0.72em;font-weight:600;font-family:var(--mono)}
.f-chip.spec{background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);color:#93c5fd}
.f-chip.line{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#fde68a}
.f-chip.locator{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#fca5a5;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.f-chip.step{background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.25);color:#d8b4fe}
.f-chip svg{width:10px;height:10px;flex-shrink:0}
.tc-ai-quick{margin-top:6px;padding:7px 10px;background:linear-gradient(135deg,rgba(124,58,237,0.07),rgba(168,85,247,0.03));border:1px dashed rgba(168,85,247,0.22);border-radius:8px;font-size:0.74em;color:#a78bfa;display:flex;align-items:center;gap:8px;cursor:pointer}
.tc-ai-quick strong{color:#d8b4fe;font-weight:600}
.tc-ai-quick .arrow{margin-left:auto;color:var(--text3);font-size:0.9em;transition:transform var(--t)}
.tc:hover .tc-ai-quick .arrow{transform:translateX(3px)}
.sev-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:50px;font-size:0.66em;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap}
.sev-badge.critical{background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.35);color:#fca5a5}
.sev-badge.high{background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.35);color:#fde68a}
.sev-badge.medium{background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.35);color:#93c5fd}
.sev-badge.low{background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.35);color:#86efac}

/* â•â•â• OVERLAY & DRAWER â•â•â• */
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:900}
.overlay.open{display:block;animation:fadeIn 0.18s ease}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(900px,100vw);background:var(--surface);border-left:1px solid var(--border);overflow-y:auto;z-index:1000;transform:translateX(100%);transition:transform 0.36s cubic-bezier(0.16,1,0.3,1)}
.drawer.open{transform:translateX(0)}
.dr-hdr{position:sticky;top:0;z-index:5;background:var(--surface);border-bottom:1px solid var(--border);padding:14px 20px;display:flex;align-items:flex-start;gap:12px}
.dr-stripe{width:4px;min-height:40px;border-radius:4px;flex-shrink:0;align-self:stretch}
.dr-hdr-info{flex:1;min-width:0}
.dr-title{font-size:1.05em;font-weight:700;color:var(--text);line-height:1.3}
.dr-suite{font-size:0.77em;color:var(--text2);margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dr-close{margin-left:auto;flex-shrink:0;width:32px;height:32px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all var(--t);color:var(--text2)}
.dr-close:hover{background:var(--red-dim);border-color:rgba(239,68,68,0.4);color:var(--red);transform:rotate(90deg)}
.dr-close svg{width:14px;height:14px}

/* â•â•â• TABS â•â•â• */
.tabs-bar{position:sticky;top:61px;z-index:4;background:var(--surface);border-bottom:1px solid var(--border);display:flex;gap:0;overflow-x:auto}
.tab-btn{padding:10px 18px;font-size:0.82em;font-weight:600;color:var(--text3);border:none;background:none;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all var(--t);display:flex;align-items:center;gap:6px;margin-bottom:-1px}
.tab-btn:hover{color:var(--text2)}
.tab-btn.active{color:var(--accent2);border-bottom-color:var(--accent2)}
.tab-pane{display:none;padding:20px}
.tab-pane.active{display:block}

/* â•â•â• OVERVIEW TAB â•â•â• */
.ov-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:20px}
.ov-cell{background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px}
.ov-lbl{font-size:0.67em;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;font-weight:600;margin-bottom:4px}
.ov-val{font-size:0.92em;font-weight:600;color:var(--text)}

/* â•â•â• ERROR FORENSICS PANEL (in drawer) â•â•â• */
.forensics-panel{background:rgba(239,68,68,0.03);border:1px solid rgba(239,68,68,0.2);border-radius:var(--rl);overflow:hidden;margin-bottom:20px}
.forensics-hdr{background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(220,38,38,0.06));border-bottom:1px solid rgba(239,68,68,0.18);padding:12px 16px;display:flex;align-items:center;gap:12px}
.forensics-icon{font-size:1.4em}
.forensics-ht{font-size:0.95em;font-weight:700;color:#fca5a5}
.forensics-hs{font-size:0.74em;color:#f87171;opacity:0.75;margin-top:1px}
.forensics-body{padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.f-section{display:flex;flex-direction:column;gap:6px}
.f-label{font-size:0.65em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:2px}
.f-value{font-family:var(--mono);font-size:0.83em;color:var(--text);padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;word-break:break-all;line-height:1.5}
.f-value.locator-v{color:#fca5a5;background:rgba(239,68,68,0.06);border-color:rgba(239,68,68,0.2)}
.f-value.line-v{color:#fde68a;background:rgba(245,158,11,0.06);border-color:rgba(245,158,11,0.2)}
.f-value.spec-v{color:#93c5fd;background:rgba(59,130,246,0.06);border-color:rgba(59,130,246,0.2)}
.f-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:500px){.f-grid{grid-template-columns:1fr}}
.f-cell{background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;position:relative;overflow:hidden}
.f-cell::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.f-cell.spec::before{background:var(--blue)}
.f-cell.line-num::before{background:var(--yellow)}
.f-cell.loc::before{background:var(--red)}
.f-cell-lbl{font-size:0.65em;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;font-weight:600;margin-bottom:5px}
.f-cell-val{font-family:var(--mono);font-size:0.82em;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.f-cell.spec .f-cell-val{color:#93c5fd}
.f-cell.line-num .f-cell-val{color:#fde68a}
.f-cell.loc .f-cell-val{color:#fca5a5}

/* â•â•â• ERROR SECTION â•â•â• */
.sec-hdr{font-size:0.72em;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text3);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.sec-hdr::after{content:'';flex:1;height:1px;background:var(--border)}
.err-outer{background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.22);border-radius:var(--r);padding:14px}
.err-msg{font-family:var(--mono);font-size:0.78em;color:#fca5a5;line-height:1.75;white-space:pre-wrap;word-break:break-word}
.stk-btn{margin-top:9px;font-size:0.74em;color:var(--text3);cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:6px;border:1px solid var(--border);background:none;transition:all var(--t)}
.stk-btn:hover{border-color:var(--border2);color:var(--text2)}
.stk-btn svg{width:10px;height:10px;transition:transform var(--t)}
.stk{display:none;margin-top:9px;font-family:var(--mono);font-size:0.72em;color:var(--text3);line-height:1.65;white-space:pre-wrap;word-break:break-word;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px;max-height:220px;overflow-y:auto}
.stk.open{display:block}
.stk-line{display:block;padding:1px 0}
.stk-line.highlight{color:#fde68a;background:rgba(245,158,11,0.08);padding:2px 4px;border-radius:3px;margin:-2px -4px}

/* â•â•â• AI INSIGHTS TAB â•â•â• */
.ai-panel2{background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(168,85,247,0.02));border:1px solid rgba(168,85,247,0.24);border-radius:var(--rl);overflow:hidden;position:relative;margin-bottom:16px}
.ai-panel2::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--ai-grad);pointer-events:none}
.ai2-hdr{padding:14px 18px;display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(168,85,247,0.15)}
.ai2-icon{width:46px;height:46px;border-radius:12px;background:var(--ai-grad);display:flex;align-items:center;justify-content:center;font-size:1.4em;box-shadow:0 0 28px rgba(124,58,237,0.6);flex-shrink:0}
.ai2-hdr-info{flex:1}
.ai2-title{font-size:1em;font-weight:700;color:#e2d9f3}
.ai2-sub{font-size:0.72em;color:#a78bfa;margin-top:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ai2-model{display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:50px;background:rgba(124,58,237,0.18);border:1px solid rgba(168,85,247,0.28);font-size:0.9em;font-family:var(--mono);color:#c084fc}
.ai2-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
.conf-block{display:flex;align-items:center;gap:8px}
.conf-lbl2{font-size:0.72em;color:#a78bfa}
.conf-bar2{width:90px;height:7px;background:rgba(124,58,237,0.15);border-radius:4px;overflow:hidden}
.conf-fill2{height:100%;border-radius:4px;transition:width 1.3s cubic-bezier(0.4,0,0.2,1)}
.conf-val2{font-size:0.84em;font-weight:700}

/* AI Cards */
.ai-cards{display:flex;flex-direction:column;gap:12px;padding:16px 18px}
.aic{border-radius:var(--r);padding:14px 16px;position:relative;overflow:hidden}
.aic::before{content:'';position:absolute;top:0;left:0;bottom:0;width:3px;border-radius:3px 0 0 3px}
.aic.why{background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.2)}
.aic.why::before{background:var(--blue)}
.aic.how{background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.18)}
.aic.how::before{background:var(--green)}
.aic.impact{background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.18)}
.aic.impact::before{background:var(--yellow)}
.aic.prevent{background:rgba(14,182,212,0.04);border:1px solid rgba(6,182,212,0.18)}
.aic.prevent::before{background:var(--cyan)}
.aic.cat{background:rgba(124,58,237,0.05);border:1px solid rgba(168,85,247,0.2)}
.aic.cat::before{background:var(--accent)}
.aic.code{background:#0a0f1a;border:1px solid #1e2d42}
.aic.code::before{background:#fbbf24}
.aic-lbl{font-size:0.67em;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;margin-bottom:9px;display:flex;align-items:center;gap:6px}
.aic-lbl.why{color:#93c5fd}.aic-lbl.how{color:#86efac}.aic-lbl.impact{color:#fde68a}.aic-lbl.prevent{color:#67e8f9}.aic-lbl.cat{color:#d8b4fe}.aic-lbl.code{color:#fbbf24}
.aic-lbl svg{width:11px;height:11px}
.aic-val{font-size:0.86em;color:#d4c4f0;line-height:1.75;white-space:pre-wrap}
.cat-main{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:10px;background:linear-gradient(135deg,rgba(124,58,237,0.22),rgba(168,85,247,0.12));border:1px solid rgba(168,85,247,0.38);font-size:0.9em;font-weight:700;color:#d8b4fe}
.alt-cats{display:flex;flex-direction:column;gap:5px;margin-top:10px}
.alt-c{display:flex;align-items:center;gap:8px}
.alt-c-name{font-size:0.75em;color:#a78bfa;width:140px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.alt-c-bar{flex:1;height:4px;background:rgba(124,58,237,0.12);border-radius:2px;overflow:hidden}
.alt-c-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,#7c3aed,#a855f7)}
.alt-c-pct{font-size:0.7em;color:var(--text3);width:30px;text-align:right;flex-shrink:0}
.tags2{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.tag2{padding:2px 8px;background:rgba(124,58,237,0.08);border:1px solid rgba(168,85,247,0.18);border-radius:50px;font-size:0.68em;font-family:var(--mono);color:#a78bfa}

/* Fix Approaches */
.fix-approaches{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.fix-approach{background:rgba(34,197,94,0.03);border:1px solid rgba(34,197,94,0.15);border-radius:var(--r);padding:12px 14px}
.fix-approach-hdr{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.fix-num{width:22px;height:22px;border-radius:50%;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#86efac;font-size:0.72em;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fix-approach-title{font-size:0.8em;font-weight:600;color:#86efac}
.fix-approach-val{font-size:0.82em;color:#d4c4f0;line-height:1.7;padding-left:30px}
.code-block{position:relative;background:#060b12;border:1px solid #1a2332;border-radius:var(--r);padding:14px;font-family:var(--mono);font-size:0.78em;color:#c9d1d9;line-height:1.75;white-space:pre-wrap;overflow-x:auto;margin-top:4px}
.copy-btn{position:absolute;top:8px;right:8px;padding:3px 9px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:0.7em;color:var(--text2);transition:all var(--t)}
.copy-btn:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.meta-chips{display:flex;flex-wrap:wrap;gap:7px;padding:10px 18px;border-top:1px solid rgba(168,85,247,0.12);border-bottom:1px solid rgba(168,85,247,0.12);background:rgba(0,0,0,0.12)}
.meta-chip2{display:flex;align-items:center;gap:5px;font-size:0.72em;color:#a78bfa;padding:3px 8px;background:rgba(124,58,237,0.08);border-radius:50px;border:1px solid rgba(168,85,247,0.15)}
.meta-chip2 svg{width:10px;height:10px;opacity:0.8}

/* â•â•â• STEPS TAB â•â•â• */
.steps-timeline{display:flex;flex-direction:column;gap:0}
.stp2{display:flex;align-items:flex-start;gap:14px;position:relative;padding:0 0 0 0}
.stp2:not(:last-child){margin-bottom:4px}
.stp2-left{display:flex;flex-direction:column;align-items:center;width:28px;flex-shrink:0;padding-top:10px}
.stp2-num{width:24px;height:24px;border-radius:50%;font-size:0.68em;font-weight:700;display:flex;align-items:center;justify-content:center;z-index:1;flex-shrink:0}
.stp2-num.passed{background:rgba(34,197,94,0.15);border:1.5px solid rgba(34,197,94,0.4);color:#86efac}
.stp2-num.failed{background:rgba(239,68,68,0.15);border:1.5px solid rgba(239,68,68,0.5);color:#fca5a5;box-shadow:0 0 12px rgba(239,68,68,0.3)}
.stp2-num.skipped{background:rgba(107,114,128,0.12);border:1.5px solid rgba(107,114,128,0.3);color:#9ca3af}
.stp2-line{width:1px;flex:1;min-height:8px;margin-top:2px;background:var(--border)}
.stp2-body{flex:1;min-width:0;padding:8px 12px;border-radius:var(--r);border:1px solid var(--border);margin-bottom:4px;background:var(--surface2);transition:all var(--t)}
.stp2-body.failed{background:rgba(239,68,68,0.04);border-color:rgba(239,68,68,0.28);box-shadow:0 0 20px rgba(239,68,68,0.08)}
.stp2-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.stp2-name{font-size:0.85em;font-weight:500;color:var(--text)}
.stp2-body.failed .stp2-name{color:#fca5a5;font-weight:600}
.stp2-dur{font-size:0.72em;color:var(--text3);white-space:nowrap;flex-shrink:0}
.stp2-err{margin-top:8px;font-size:0.75em;color:#fca5a5;font-family:var(--mono);white-space:pre-wrap;word-break:break-word;padding:8px;background:rgba(239,68,68,0.06);border-radius:6px;border-left:2px solid rgba(239,68,68,0.4)}
.stp2-fail-badge{display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:50px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);font-size:0.65em;font-weight:700;color:#fca5a5;margin-top:6px}
.steps-summary{background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.ss-item{display:flex;align-items:center;gap:6px;font-size:0.8em;color:var(--text2)}
.ss-dot{width:7px;height:7px;border-radius:50%}

/* â•â•â• EVIDENCE TAB â•â•â• */
.att-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.att{background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;cursor:pointer;transition:all var(--t);position:relative}
.att:hover{transform:translateY(-3px);box-shadow:var(--sh2);border-color:var(--accent)}
.att img,.att video{width:100%;height:120px;display:block;object-fit:cover}
.att video{background:#000}
.att-ph{height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:2em;gap:6px;background:var(--surface3)}
.att-ph span{font-size:0.28em;color:var(--text2);font-family:var(--font)}
.att-lbl{padding:8px 10px;font-size:0.74em;color:var(--text2);font-weight:500}
.att-acts{position:absolute;top:6px;right:6px;display:flex;gap:4px;opacity:0;transition:opacity var(--t)}
.att:hover .att-acts{opacity:1}
.att-btn{width:27px;height:27px;border-radius:6px;border:none;cursor:pointer;background:rgba(0,0,0,0.75);color:#fff;font-size:0.85em;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);transition:background var(--t)}
.att-btn:hover{background:var(--accent)}

/* â•â•â• LIGHTBOX â•â•â• */
.lb{display:none;position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.97);backdrop-filter:blur(12px);align-items:center;justify-content:center}
.lb.open{display:flex;animation:fadeIn 0.18s ease}
.lb-inner{position:relative;max-width:92vw;max-height:92vh}
.lb-inner img,.lb-inner video{max-width:100%;max-height:88vh;border-radius:var(--r);display:block}
.lb-x{position:absolute;top:-44px;right:0;width:34px;height:34px;background:rgba(255,255,255,0.08);border:none;border-radius:50%;color:#fff;font-size:1.1em;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all var(--t)}
.lb-x:hover{background:rgba(239,68,68,0.5);transform:rotate(90deg)}
.lb-nav{position:fixed;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.08);border:none;color:#fff;font-size:1.4em;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all var(--t);backdrop-filter:blur(8px)}
.lb-nav:hover{background:rgba(124,58,237,0.55)}
.lb-nav.lp{left:16px}.lb-nav.ln{right:16px}
.lb-cap{position:absolute;bottom:-30px;left:0;right:0;text-align:center;color:rgba(255,255,255,0.45);font-size:0.78em}

/* â•â•â• ANIMATIONS â•â•â• */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
.ain{animation:slideUp 0.35s ease both}

@media(max-width:700px){
  .app{padding:12px}.hdr{padding:20px 16px}.brand-name{font-size:1.4em}
  .kpi-val{font-size:1.7em}.tab-pane{padding:14px}.f-grid{grid-template-columns:1fr 1fr}
}

/* ═══ ERROR FORENSICS PANE ═══ */
.ef-pane{padding:20px;display:flex;flex-direction:column;gap:16px}
.ef-why{background:linear-gradient(135deg,rgba(239,68,68,0.08),rgba(220,38,38,0.03));border:1px solid rgba(239,68,68,0.28);border-radius:14px;overflow:hidden}
.ef-why-hdr{background:linear-gradient(90deg,rgba(239,68,68,0.14),transparent);border-bottom:1px solid rgba(239,68,68,0.2);padding:14px 18px;display:flex;align-items:center;gap:14px}
.ef-why-icon{font-size:1.9em;flex-shrink:0}
.ef-why-title{font-size:1.05em;font-weight:800;color:#fca5a5;letter-spacing:-0.3px}
.ef-why-sub{font-size:0.74em;color:#f87171;opacity:0.85;margin-top:2px}
.ef-why-body{padding:16px 18px;display:flex;flex-direction:column;gap:14px}
.ef-loc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:560px){.ef-loc-grid{grid-template-columns:1fr 1fr}}
.ef-loc-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:11px 13px;position:relative;overflow:hidden;transition:border-color 0.2s}
.ef-loc-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.ef-loc-card.spec::before{background:linear-gradient(90deg,#3b82f6,#60a5fa)}
.ef-loc-card.linecol::before{background:linear-gradient(90deg,#f59e0b,#fcd34d)}
.ef-loc-card.step::before{background:linear-gradient(90deg,#8b5cf6,#c4b5fd)}
.ef-loc-card.etype::before{background:linear-gradient(90deg,#f97316,#fb923c)}
.ef-loc-lbl{font-size:0.6em;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:var(--text3);margin-bottom:5px}
.ef-loc-val{font-family:'JetBrains Mono',monospace;font-size:0.82em;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ef-loc-card.spec .ef-loc-val{color:#93c5fd}
.ef-loc-card.linecol .ef-loc-val{color:#fde68a}
.ef-loc-card.step .ef-loc-val{color:#d8b4fe}
.ef-loc-card.etype .ef-loc-val{color:#fdba74}
.ef-section-label{font-size:0.63em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:7px;display:flex;align-items:center;gap:7px}
.ef-section-label::after{content:'';flex:1;height:1px;background:rgba(239,68,68,0.2)}
.ef-msg-box{background:#040810;border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:13px 15px;font-family:'JetBrains Mono',monospace;font-size:0.78em;color:#fca5a5;line-height:1.8;white-space:pre-wrap;word-break:break-all;max-height:180px;overflow-y:auto}
.ef-stk-wrap{background:#040810;border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden}
.ef-stk-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 13px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
.ef-stk-title{font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text3)}
.ef-stk-copy{padding:3px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;cursor:pointer;font-size:0.7em;color:var(--text2);transition:all var(--t)}
.ef-stk-copy:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.ef-stk-body{font-family:'JetBrains Mono',monospace;font-size:0.72em;color:var(--text3);line-height:1.7;white-space:pre-wrap;word-break:break-word;padding:12px 14px;max-height:240px;overflow-y:auto}
.ef-stk-line{display:block;padding:1px 0}
.ef-stk-line.hl{color:#fde68a;background:rgba(245,158,11,0.1);padding:2px 6px;border-radius:3px;margin:1px -6px;border-left:2px solid #f59e0b}
.ef-locator-box{display:flex;align-items:flex-start;gap:10px;padding:10px 13px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.22);border-radius:9px}
.ef-loc-icon{font-size:1.1em;flex-shrink:0;margin-top:1px}
.ef-loc-text{font-family:'JetBrains Mono',monospace;font-size:0.82em;color:#fca5a5;word-break:break-all;line-height:1.6}

/* ═══ FIX GUIDE PANE ═══ */
.fg-pane{padding:20px;display:flex;flex-direction:column;gap:16px}
.fg-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.fg-title{font-size:1em;font-weight:800;color:var(--text);display:flex;align-items:center;gap:9px}
.fg-time-badge{display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:50px;font-size:0.76em;font-weight:700;color:#34d399}
.fg-approaches{display:flex;flex-direction:column;gap:10px}
.fg-approach{background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden;transition:border-color var(--t)}
.fg-approach:hover{border-color:rgba(34,197,94,0.4)}
.fg-approach-hdr{display:flex;align-items:center;gap:12px;padding:12px 15px;background:rgba(34,197,94,0.04);border-bottom:1px solid rgba(34,197,94,0.12)}
.fg-num{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,rgba(34,197,94,0.2),rgba(16,185,129,0.1));border:1.5px solid rgba(34,197,94,0.4);color:#4ade80;font-size:0.72em;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fg-approach-title{font-size:0.85em;font-weight:700;color:#86efac}
.fg-approach-body{padding:11px 15px;padding-left:53px;font-size:0.83em;color:var(--text2);line-height:1.75}
.fg-code-wrap{background:#04080e;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden}
.fg-code-hdr{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
.fg-code-lang{font-size:0.66em;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:#fbbf24;display:flex;align-items:center;gap:6px}
.fg-code-copy{padding:3px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;cursor:pointer;font-size:0.7em;color:var(--text2);transition:all var(--t)}
.fg-code-copy:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.fg-code-body{font-family:'JetBrains Mono',monospace;font-size:0.78em;color:#c9d1d9;line-height:1.8;white-space:pre-wrap;overflow-x:auto;padding:14px 16px}
.fg-prevention{background:rgba(6,182,212,0.04);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:15px 16px}
.fg-prev-title{font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:#67e8f9;margin-bottom:10px;display:flex;align-items:center;gap:7px}
.fg-prev-list{display:flex;flex-direction:column;gap:7px}
.fg-prev-item{display:flex;align-items:flex-start;gap:9px;font-size:0.83em;color:var(--text2);line-height:1.65}
.fg-prev-dot{width:6px;height:6px;border-radius:50%;background:#06b6d4;flex-shrink:0;margin-top:6px}
.fg-tags{display:flex;flex-wrap:wrap;gap:6px}
.fg-tag{padding:3px 10px;background:rgba(124,58,237,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:50px;font-size:0.7em;font-family:'JetBrains Mono',monospace;color:#a78bfa}

/* ═══ ENHANCED CARD CHIP ═══ */
.f-chip.etype{background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);color:#fdba74}
</style>
</head>
<body>
<div class="app">

<header class="hdr ain">
  <div class="hdr-inner">
    <div class="brand">
      <div class="brand-icon">ðŸŽ­</div>
      <div>
        <div class="brand-name">PlayVision</div>
        <div class="brand-sub">
          <span>AI-Powered Playwright Reporter</span>
          <span class="brand-sub-dot"></span>
          <span>${dateTimeStr}</span>
          <span class="brand-sub-dot"></span>
          <span>${durationSec}s Â· ${metadata.workers} workers</span>
        </div>
      </div>
    </div>
    <div class="hdr-right">
      <button class="theme-btn" onclick="toggleTheme()">
        <svg id="themeIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <span id="themeLbl">Light Mode</span>
      </button>
    </div>
  </div>
</header>

<div class="kpi-row">
  <div class="kpi total ain" style="animation-delay:.04s" onclick="filterStatus('all')">
    <div class="kpi-bar"></div><span class="kpi-icon">ðŸ“Š</span>
    <div class="kpi-val">${metadata.totalTests}</div>
    <div class="kpi-lbl">Total Tests</div>
  </div>
  <div class="kpi passed ain" style="animation-delay:.08s" onclick="filterStatus('passed')">
    <div class="kpi-bar"></div><span class="kpi-icon">âœ…</span>
    <div class="kpi-val">${metadata.passed}</div>
    <div class="kpi-lbl">Passed</div>
  </div>
  <div class="kpi failed ain" style="animation-delay:.12s" onclick="filterStatus('failed')">
    <div class="kpi-bar"></div><span class="kpi-icon">âŒ</span>
    <div class="kpi-val">${metadata.failed}</div>
    <div class="kpi-lbl">Failed</div>
  </div>
  <div class="kpi skipped ain" style="animation-delay:.16s" onclick="filterStatus('skipped')">
    <div class="kpi-bar"></div><span class="kpi-icon">â­ï¸</span>
    <div class="kpi-val">${metadata.skipped}</div>
    <div class="kpi-lbl">Skipped</div>
  </div>
  <div class="kpi flaky ain" style="animation-delay:.20s" onclick="filterStatus('flaky')">
    <div class="kpi-bar"></div><span class="kpi-icon">âš ï¸</span>
    <div class="kpi-val">${flakyCount}</div>
    <div class="kpi-lbl">Flaky</div>
  </div>
  <div class="kpi ai ain" style="animation-delay:.24s">
    <div class="kpi-bar"></div><span class="kpi-icon">ðŸ¤–</span>
    <div class="kpi-val">${aiCount}</div>
    <div class="kpi-lbl">AI Insights</div>
  </div>
</div>

<div class="dash-row ain" style="animation-delay:.28s">
  <div class="card" id="suiteCrd"></div>
  <div class="card" id="catCrd"></div>
  <div class="ring-card">
    <div class="ring-wrap">
      <svg class="ring-svg" width="150" height="150" viewBox="0 0 150 150">
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#22c55e"/>
            <stop offset="100%" stop-color="#4ade80"/>
          </linearGradient>
        </defs>
        <circle class="ring-track" cx="75" cy="75" r="62"/>
        <circle class="ring-fill" id="ringFill" cx="75" cy="75" r="62"
          stroke="url(#rg)"
          stroke-dasharray="${ringCirc.toFixed(2)}"
          stroke-dashoffset="${ringCirc.toFixed(2)}"/>
      </svg>
      <div class="ring-center">
        <div class="ring-pct">${passRate}%</div>
        <div class="ring-lbl">Pass Rate</div>
      </div>
    </div>
    <div class="ring-legend">
      <div class="rleg"><div class="rleg-dot" style="background:#22c55e"></div>${metadata.passed} Passed</div>
      <div class="rleg"><div class="rleg-dot" style="background:#ef4444"></div>${metadata.failed} Failed</div>
      ${metadata.skipped > 0 ? `<div class="rleg"><div class="rleg-dot" style="background:#6b7280"></div>${metadata.skipped} Skipped</div>` : ''}
    </div>
  </div>
</div>

<div class="controls ain" style="animation-delay:.32s">
  <div class="sbox">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input type="text" id="srch" placeholder="Search tests, suites, locators, error messagesâ€¦" oninput="applyF()">
  </div>
  <select id="stF" onchange="applyF()">
    <option value="all">All Status</option>
    <option value="passed">âœ… Passed</option>
    <option value="failed">âŒ Failed</option>
    <option value="timedOut">â° Timed Out</option>
    <option value="skipped">â­ï¸ Skipped</option>
    <option value="flaky">âš ï¸ Flaky</option>
  </select>
  <select id="suF" onchange="applyF()"></select>
  <select id="sevF" onchange="applyF()">
    <option value="all">All Severity</option>
    <option value="critical">ðŸ”´ Critical</option>
    <option value="high">ðŸŸ  High</option>
    <option value="medium">ðŸ”µ Medium</option>
    <option value="low">ðŸŸ¢ Low</option>
  </select>
  <button class="sort-btn" id="sortBtn" onclick="toggleSort()">â± Sort: Duration</button>
  <span class="res-count" id="resCnt"></span>
</div>

<div class="test-list" id="tList"></div>
</div>

<div class="overlay" id="ov" onclick="closeDr()"></div>
<div class="drawer" id="drawer">
  <div class="dr-hdr">
    <div class="dr-stripe" id="drStripe"></div>
    <div class="dr-hdr-info">
      <div class="dr-title" id="drTitle"></div>
      <div class="dr-suite" id="drSuite"></div>
    </div>
    <button class="dr-close" onclick="closeDr()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div class="tabs-bar" id="tabsBar"></div>
  <div id="drBody"></div>
</div>

<div class="lb" id="lb">
  <div class="lb-inner">
    <button class="lb-x" onclick="closeLB()">âœ•</button>
    <div id="lbM"></div>
    <div class="lb-cap" id="lbC"></div>
  </div>
  <button class="lb-nav lp" id="lbP" onclick="navLB(-1)">â€¹</button>
  <button class="lb-nav ln" id="lbN" onclick="navLB(1)">â€º</button>
</div>

<script>
const D=${JSON.stringify(results)};
const M=${JSON.stringify(metadata)};

/* â”€â”€ Theme â”€â”€ */
function toggleTheme(){
  document.body.classList.toggle('light');
  const l=document.body.classList.contains('light');
  localStorage.setItem('pvT',l?'l':'d');
  document.getElementById('themeLbl').textContent=l?'Dark Mode':'Light Mode';
  document.getElementById('themeIco').innerHTML=l
    ?'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    :'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}
if(localStorage.getItem('pvT')==='l') toggleTheme();

/* â”€â”€ Error Parsing â”€â”€ */
function parseForensics(r){
  const out={spec:'',line:'',col:'',locator:'',stepName:'',stepNum:0};
  if(!r.error)return out;
  const msg=r.error.message||'';
  const stk=r.error.stack||'';

  // Extract locator from error message
  const locPatterns=[
    /locator\(['"](.+?)['"]\)/i,
    /getByRole\(['"](.+?)['"],\s*\{[^}]*\}\)/i,
    /getByRole\(['"](.+?)['"]\)/i,
    /getByText\(['"](.+?)['"]\)/i,
    /getByLabel\(['"](.+?)['"]\)/i,
    /getByPlaceholder\(['"](.+?)['"]\)/i,
    /getByTestId\(['"](.+?)['"]\)/i,
    /getBy\w+\(['"]([^'"]+)['"]\)/i,
    /selector=['"]([^'"]+)['"]/i,
    /\[data-testid=['"]([^'"]+)['"]\]/i,
    /#([\w-]+)/,
    /\.([\w-]+[\w-]*)/,
    /> (.+?) <\//,
  ];
  for(const p of locPatterns){
    const m=msg.match(p)||stk.match(p);
    if(m){out.locator=m[0].length>60?m[0].substring(0,57)+'...':m[0];break;}
  }

  // Extract spec file + line from stack
  const stackLines=(stk||msg).split('\n');
  for(const sl of stackLines){
    const m=sl.match(/at .+? \((.+?):(\d+):(\d+)\)/)||sl.match(/(.+?\.spec\.[tj]s):(\d+):(\d+)/);
    if(m){
      const fp=m[1];
      if(fp.includes('.spec.')||fp.includes('test')){
        out.spec=fp.split(/[\\/]/).pop()||fp;
        out.line=m[2];out.col=m[3];break;
      }
    }
  }
  // Fallback: first spec-looking line
  if(!out.spec){
    for(const sl of stackLines){
      const m=sl.match(/([^\\/]+\.spec\.[tj]s):(\d+)/);
      if(m){out.spec=m[1];out.line=m[2];break;}
    }
  }

  // Failing step
  const failedSteps=r.steps.filter(s=>s.status==='failed');
  if(failedSteps.length){
    const fs=failedSteps[0];
    out.stepName=fs.name;
    out.stepNum=r.steps.indexOf(fs)+1;
  }
  return out;
}

function highlightStack(stk,specFile){
  return stk.split('\n').map(line=>{
    const isHighlight=specFile&&line.includes(specFile);
    const safe=esc(line);
    return isHighlight?'<span class="ef-stk-line hl">'+safe+'</span>':'<span class="ef-stk-line">'+safe+'</span>';
  }).join('\n');
}

/* â”€â”€ Init â”€â”€ */
let sortDir='none';
window.addEventListener('load',()=>{
  // Ring
  const circ=${ringCirc.toFixed(2)};
  const p=M.totalTests>0?M.passed/M.totalTests:0;
  const rf=document.getElementById('ringFill');
  if(rf)setTimeout(()=>{rf.style.strokeDashoffset=circ*(1-p)},100);

  // Suite breakdown
  const sm={};
  D.forEach(r=>{if(!sm[r.suite])sm[r.suite]={t:0,p:0,f:0};sm[r.suite].t++;if(r.status==='passed')sm[r.suite].p++;else if(r.status==='failed'||r.status==='timedOut')sm[r.suite].f++;});
  let h='<div class="card-title">Suite Breakdown</div>';
  const suiteMax=Math.max(...Object.values(sm).map(s=>s.t));
  Object.entries(sm).forEach(([n,s])=>{
    const pc=s.t>0?Math.round(s.p/s.t*100):0;
    const bg=pc>=80?'#22c55e':pc>=50?'#f59e0b':'#ef4444';
    h+=\`<div class="suite-row"><div class="suite-hd"><span>\${esc(n)}</span><span>\${s.p}/\${s.t} Â· \${pc}%</span></div><div class="suite-bar"><div class="suite-fill" style="width:\${pc}%;background:\${bg}"></div></div></div>\`;
  });
  document.getElementById('suiteCrd').innerHTML=h;

  // Error category distribution
  const cats={};
  D.filter(r=>r.error&&r.error.aiAnalysis).forEach(r=>{
    const c=r.error.aiAnalysis.category||'Unknown';
    cats[c]=(cats[c]||0)+1;
  });
  const catMax=Math.max(1,...Object.values(cats));
  let ch='<div class="card-title">AI Error Categories</div>';
  if(Object.keys(cats).length===0){ch+='<div style="font-size:0.82em;color:var(--text3);text-align:center;padding:20px 0">No AI errors analyzed</div>';}
  else{
    ch+='<div class="cat-dist">';
    Object.entries(cats).sort((a,b)=>b[1]-a[1]).forEach(([c,n])=>{
      ch+=\`<div class="cat-row2"><span class="cat-name2">\${esc(c)}</span><div class="cat-bar2"><div class="cat-fill2" style="width:\${Math.round(n/catMax*100)}%"></div></div><span class="cat-cnt2">\${n}</span></div>\`;
    });
    ch+='</div>';
  }
  document.getElementById('catCrd').innerHTML=ch;

  // Suite filter
  const sf=document.getElementById('suF');
  sf.innerHTML='<option value="all">All Suites</option>';
  Object.keys(sm).forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;sf.appendChild(o);});
  applyF();
});

/* â”€â”€ Sort â”€â”€ */
function toggleSort(){
  sortDir=sortDir==='asc'?'desc':sortDir==='desc'?'none':'asc';
  const lb=document.getElementById('sortBtn');
  lb.textContent=sortDir==='none'?'â± Sort: Duration':sortDir==='asc'?'â« Duration: Asc':'â¬ Duration: Desc';
  lb.className='sort-btn'+(sortDir!=='none'?' active':'');
  applyF();
}

/* â”€â”€ Filters â”€â”€ */
function filterStatus(s){document.getElementById('stF').value=s;applyF();}
function applyF(){
  const q=document.getElementById('srch').value.toLowerCase();
  const st=document.getElementById('stF').value;
  const su=document.getElementById('suF').value;
  const sev=document.getElementById('sevF').value;
  let f=D.filter(r=>{
    const mq=!q||(r.title.toLowerCase().includes(q)||r.suite.toLowerCase().includes(q)||(r.error&&r.error.message&&r.error.message.toLowerCase().includes(q)));
    const ms=st==='all'||r.status===st;
    const mu=su==='all'||r.suite===su;
    const mv=sev==='all'||!r.error||!r.error.aiAnalysis||(r.error.aiAnalysis.severity===sev);
    return mq&&ms&&mu&&mv;
  });
  if(sortDir!=='none') f=[...f].sort((a,b)=>sortDir==='asc'?a.duration-b.duration:b.duration-a.duration);
  document.getElementById('resCnt').textContent=f.length+' / '+D.length+' tests';
  renderList(f);
}

/* â”€â”€ Render List â”€â”€ */
function renderList(list){
  const el=document.getElementById('tList');
  if(!list.length){
    el.innerHTML='<div class="empty"><div class="empty-icon">ðŸ”</div><div>No tests match your filters</div></div>';
    return;
  }
  el.innerHTML=list.map((r,i)=>{
    const ai=r.error&&r.error.aiAnalysis;
    const forensics=parseForensics(r);
    const isFail=r.status==='failed'||r.status==='timedOut';
    const sev=ai&&ai.severity;
    const sevEmoji={critical:'\ud83d\udd34',high:'\ud83d\udfe0',medium:'\ud83d\udd35',low:'\ud83d\udfe2'};
    return \`<div class="tc \${r.status} ain" style="animation-delay:\${Math.min(i*0.02,0.45)}s" onclick="openDr('\${r.testId}')">
      <div class="tc-stripe"></div>
      <div class="tc-body">
        <div class="tc-top">
          <div class="tc-title">\${esc(r.title)}</div>
          <div class="tc-right">
            \${sev?\`<div class="sev-badge \${sev}">\${sevEmoji[sev]||''} \${sev}</div>\`:''}
            \${ai?\`<div class="ai-pill">\u{1F916} AI</div>\`:''}
            <div class="sbadge \${r.status}">\${r.status}</div>
          </div>
        </div>
        <div class="tc-meta">
          <div class="mc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\${esc(r.suite)}</div>
          <div class="mc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>\${(r.duration/1000).toFixed(2)}s</div>
          \${r.retries>0?\`<div class="mc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>\${r.retries} retries</div>\`:''}
          \${r.steps.length?\`<div class="mc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>\${r.steps.length} steps</div>\`:''}
          \${r.attachments.length?\`<div class="mc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>\${r.attachments.length} files</div>\`:''}
        </div>
        \${isFail&&(forensics.spec||forensics.locator||forensics.stepName)?\`
        <div class="tc-forensics">
          <div class="forensics-row">
            \${forensics.spec?\`<span class="f-chip spec"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>\${esc(forensics.spec)}</span>\`:''}
            \${forensics.line?\`<span class="f-chip line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Line \${forensics.line}\${forensics.col?':'+forensics.col:''}</span>\`:''}
            \${forensics.stepName?\`<span class="f-chip step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></svg>Step \${forensics.stepNum}: \${esc(forensics.stepName.substring(0,40)+(forensics.stepName.length>40?'...':''))}</span>\`:''}
            \${ai&&ai.category?\`<span class="f-chip etype">\u26a1 \${esc(ai.category)}</span>\`:''}
          </div>
          \${forensics.locator?\`<div class="forensics-row"><span class="f-chip locator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Locator: \${esc(forensics.locator)}</span></div>\`:''}
        </div>\`:''}
        \${ai?\`<div class="tc-ai-quick">
          \u{1F916} <strong>\${esc(ai.category)}</strong>
          \${ai.rootCause?\`<span style="color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px">\${esc(ai.rootCause.substring(0,70)+(ai.rootCause.length>70?'...':''))}</span>\`:''}
          \${ai.estimatedFixTime?\`<span style="color:var(--text4);white-space:nowrap">\u23f1 \${esc(ai.estimatedFixTime)} fix</span>\`:''}
          <span class="arrow">\u2192 Click for full analysis</span>
        </div>\`:''}
      </div>
    </div>\`;
  }).join('');
}

/* â”€â”€ Drawer â”€â”€ */
const SC={passed:'#22c55e',failed:'#ef4444',timedOut:'#f59e0b',skipped:'#6b7280',flaky:'#f97316'};
let activeTab='ov';
function openDr(id){
  const r=D.find(x=>x.testId===id);if(!r)return;
  document.getElementById('drStripe').style.background=SC[r.status]||'#6b7280';
  document.getElementById('drTitle').textContent=r.title;
  const isFail=r.status==='failed'||r.status==='timedOut';
  const hdr=document.getElementById('drSuite');
  hdr.innerHTML=\`<span>\${esc(r.suite)}</span>
    <span class="sbadge \${r.status}" style="font-size:0.7em">\${r.status}</span>
    <span style="color:var(--text3)">\${(r.duration/1000).toFixed(2)}s</span>
    \${r.retries>0?\`<span style="color:var(--orange)">\${r.retries} retries</span>\`:''}\`;

  // Build tabs
  const isFail2=r.status==='failed'||r.status==='timedOut';
  const tabs=[
    {id:'ov',label:'📋 Overview'},
    ...(isFail2?[{id:'ef',label:'🔴 Error Forensics'}]:[]),
    ...(r.error&&r.error.aiAnalysis?[{id:'ai',label:'🤖 AI Analysis'}]:[]),
    ...(r.error&&r.error.aiAnalysis?[{id:'fg',label:'🔧 Fix Guide'}]:[]),
    ...(r.steps.length?[{id:'steps',label:'📋 Steps ('+r.steps.length+')'}]:[]),
    ...(r.attachments.length?[{id:'ev',label:'📎 Evidence ('+r.attachments.length+')'}]:[]),
  ];
  // For failures, default to the Error Forensics tab
  if(isFail2&&(activeTab==='ov'||!tabs.find(t=>t.id===activeTab)))activeTab='ef';
  const tb=document.getElementById('tabsBar');
  tb.innerHTML=tabs.map(t=>\`<button class="tab-btn\${t.id===activeTab?' active':''}" onclick="switchTab('\${t.id}',this)">\${t.label}</button>\`).join('');

  // Build content
  document.getElementById('drBody').innerHTML=buildAllPanes(r);
  switchTabById(activeTab);

  document.getElementById('drawer').classList.add('open');
  document.getElementById('ov').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeDr(){
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('ov').classList.remove('open');
  document.body.style.overflow='';
}
function switchTab(id,btn){
  activeTab=id;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  switchTabById(id);
}
function switchTabById(id){
  document.querySelectorAll('.tab-pane').forEach(p=>{p.classList.remove('active');p.style.display='none';});
  const pane=document.getElementById('pane-'+id);
  if(pane){pane.classList.add('active');pane.style.display='block';}
}

/* â”€â”€ Build all panes â”€â”€ */
function buildAllPanes(r){
  const forensics=parseForensics(r);
  const isFail=r.status==='failed'||r.status==='timedOut';
  let html='';

  /* ╔╗ OVERVIEW PANE ╗╗ */
  let ov='<div class="tab-pane" id="pane-ov">';
  // Info grid
  ov+=\`<div class="ov-grid">
    <div class="ov-cell"><div class="ov-lbl">Status</div><div class="ov-val"><span class="sbadge \${r.status}">\${r.status}</span></div></div>
    <div class="ov-cell"><div class="ov-lbl">Duration</div><div class="ov-val">\${(r.duration/1000).toFixed(2)}s</div></div>
    <div class="ov-cell"><div class="ov-lbl">Retries</div><div class="ov-val">\${r.retries}</div></div>
    <div class="ov-cell"><div class="ov-lbl">Total Steps</div><div class="ov-val">\${r.steps.length}</div></div>
    <div class="ov-cell"><div class="ov-lbl">Attachments</div><div class="ov-val">\${r.attachments.length}</div></div>
    \${r.error&&r.error.aiAnalysis&&r.error.aiAnalysis.severity?\`<div class="ov-cell"><div class="ov-lbl">Severity</div><div class="ov-val"><span class="sev-badge \${r.error.aiAnalysis.severity}">\${r.error.aiAnalysis.severity}</span></div></div>\`:''}
  </div>\`;

  // Error Forensics (the "where exactly did this fail" section)
  if(isFail&&(forensics.spec||forensics.locator||forensics.stepName)){
    ov+=\`<div class="forensics-panel">
      <div class="forensics-hdr">
        <span class="forensics-icon">&#128300;</span>
        <div><div class="forensics-ht">Error Forensics</div><div class="forensics-hs">Exact failure location identified</div></div>
      </div>
      <div class="forensics-body">
        <div class="f-grid">
          \${forensics.spec?\`<div class="f-cell spec"><div class="f-cell-lbl">&#128196; Spec File</div><div class="f-cell-val" title="\${esc(forensics.spec)}">\${esc(forensics.spec)}</div></div>\`:'<div></div>'}
          \${forensics.line?\`<div class="f-cell line-num"><div class="f-cell-lbl">&#128205; Line : Col</div><div class="f-cell-val">\${forensics.line}\${forensics.col?':'+forensics.col:''}</div></div>\`:'<div></div>'}
          \${forensics.stepNum?\`<div class="f-cell"><div class="f-cell-lbl">&#128290; Failed Step</div><div class="f-cell-val" style="color:#d8b4fe">Step \${forensics.stepNum} of \${r.steps.length}</div></div>\`:'<div></div>'}
        </div>
        \${forensics.locator?\`<div class="f-section"><div class="f-label">&#127919; Failing Locator / Selector</div><div class="f-value locator-v">\${esc(forensics.locator)}</div></div>\`:''}
        \${forensics.stepName?\`<div class="f-section"><div class="f-label">&#9889; Failing Step Action</div><div class="f-value">\${esc(forensics.stepName)}</div></div>\`:''}
      </div>
    </div>\`;
  }

  // Error message
  if(r.error){
    ov+=\`<div class="sec-hdr">&#10060; Error Message</div>
    <div class="err-outer">
      <div class="err-msg">\${esc(r.error.message)}</div>
      \${r.error.stack?\`<button class="stk-btn" onclick="tglStk(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> Show Stack Trace
      </button>
      <div class="stk">\${highlightStack(r.error.stack||'',forensics.spec)}</div>\`:''}
    </div>\`;
  }
  ov+='</div>';
  html+=ov;

  /* ╔╗ ERROR FORENSICS PANE (new) ╗╗ */
  html+=buildForensicsPane(r);

  /* ╔╗ AI INSIGHTS PANE ╗╗ */
  if(r.error&&r.error.aiAnalysis){
    const ai=r.error.aiAnalysis;
    const cf=Math.round(ai.confidence*100);
    const cc=cf>=80?'#22c55e':cf>=50?'#f59e0b':'#ef4444';
    const sevEmoji={critical:'&#128308;',high:'&#128992;',medium:'&#128309;',low:'&#128994;'};
    const fixSteps=ai.suggestion?ai.suggestion.split(/\n+/).filter(s=>s.trim()):[];
    let ap='<div class="tab-pane" id="pane-ai">';
    ap+=\`<div class="ai-panel2">
      <div class="ai2-hdr">
        <div class="ai2-icon">&#129302;</div>
        <div class="ai2-hdr-info">
          <div class="ai2-title">Intelligent Error Analysis</div>
          <div class="ai2-sub">PlayVision AI\${ai.model?\` &middot; <span class="ai2-model">\${esc(ai.model.split('/').pop()||ai.model)}</span>\`:''}\${ai.analyzedAt?\` &middot; Analyzed \${new Date(ai.analyzedAt).toLocaleTimeString()}\`:''}</div>
        </div>
        <div class="ai2-right">
          <div class="conf-block">
            <span class="conf-lbl2">Confidence</span>
            <div class="conf-bar2"><div class="conf-fill2" style="width:\${cf}%;background:\${cc}"></div></div>
            <span class="conf-val2" style="color:\${cc}">\${cf}%</span>
          </div>
          \${ai.severity?\`<div class="sev-badge \${ai.severity}">\${sevEmoji[ai.severity]||''} \${ai.severity} severity</div>\`:''}
        </div>
      </div>
      \${(ai.estimatedFixTime||ai.tags)?\`<div class="meta-chips">
        \${ai.estimatedFixTime?\`<div class="meta-chip2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Fix time: <strong style="color:#e2d9f3;margin-left:3px">\${esc(ai.estimatedFixTime)}</strong></div>\`:''}
        \${(ai.tags&&ai.tags.length)?\`<div class="meta-chip2">&#127991;&#65039; \${ai.tags.slice(0,4).map(t=>\`#\${esc(t)}\`).join(' ')}</div>\`:''}
      </div>\`:''}
      <div class="ai-cards">
        <div class="aic cat">
          <div class="aic-lbl cat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> Error Category</div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span class="cat-main">&#9889; \${esc(ai.category)}</span>
            \${ai.severity?\`<span class="sev-badge \${ai.severity}">\${sevEmoji[ai.severity]||''} \${ai.severity}</span>\`:''}
          </div>
          \${(ai.alternatives&&ai.alternatives.length)?\`<div class="alt-cats">\${ai.alternatives.map(a=>\`<div class="alt-c"><span class="alt-c-name">\${esc(a.category)}</span><div class="alt-c-bar"><div class="alt-c-fill" style="width:\${Math.round(a.confidence*100)}%"></div></div><span class="alt-c-pct">\${Math.round(a.confidence*100)}%</span></div>\`).join('')}</div>\`:''}
          \${(ai.tags&&ai.tags.length)?\`<div class="tags2">\${ai.tags.map(t=>\`<span class="tag2">#\${esc(t)}</span>\`).join('')}</div>\`:''}
        </div>

        \${ai.rootCause?\`<div class="aic why">
          <div class="aic-lbl why"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Why Did This Fail?</div>
          <div class="aic-val">\${esc(ai.rootCause)}</div>
        </div>\`:''}

        \${ai.impact?\`<div class="aic impact">
          <div class="aic-lbl impact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Business Impact</div>
          <div class="aic-val">\${esc(ai.impact)}</div>
        </div>\`:''}

        \${fixSteps.length?\`<div class="aic how">
          <div class="aic-lbl how"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> How to Fix</div>
          <div class="fix-approaches">\${fixSteps.map((step,i)=>{
            const clean=step.replace(/^\\d+[.)]\\s*/,'').trim();
            if(!clean)return'';
            return\`<div class="fix-approach">
              <div class="fix-approach-hdr"><span class="fix-num">\${i+1}</span><span class="fix-approach-title">Approach \${i+1}</span></div>
              <div class="fix-approach-val">\${esc(clean)}</div>
            </div>\`;
          }).filter(Boolean).join('')}</div>
        </div>\`:''}

        \${ai.fixExample?\`<div class="aic code">
          <div class="aic-lbl code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Code Fix Example</div>
          <div style="position:relative"><div class="code-block" id="fc_\${r.testId}">\${esc(ai.fixExample)}</div><button class="copy-btn" onclick="cpFix('\${r.testId}');event.stopPropagation()">Copy</button></div>
        </div>\`:''}

        \${ai.prevention?\`<div class="aic prevent">
          <div class="aic-lbl prevent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> How to Prevent in Future</div>
          <div class="aic-val">\${esc(ai.prevention)}</div>
        </div>\`:''}
      </div>
    </div>\`;
    ap+='</div>';
    html+=ap;

    /* Fix Guide pane (new) */
    html+=buildFixGuidePane(r);
  }

  /* ╔╗ STEPS PANE ╗╗ */
  if(r.steps.length){
    const passedS=r.steps.filter(s=>s.status==='passed').length;
    const failedS=r.steps.filter(s=>s.status==='failed').length;
    let sp=\`<div class="tab-pane" id="pane-steps">
      <div class="steps-summary">
        <div class="ss-item"><div class="ss-dot" style="background:#22c55e"></div>\${passedS} passed</div>
        <div class="ss-item"><div class="ss-dot" style="background:#ef4444"></div>\${failedS} failed</div>
        <div class="ss-item"><div class="ss-dot" style="background:#6b7280"></div>\${r.steps.filter(s=>s.status==='skipped').length} skipped</div>
        <div class="ss-item" style="margin-left:auto;color:var(--text3)">Total: \${r.steps.reduce((a,s)=>a+s.duration,0)}ms</div>
      </div>
      <div class="steps-timeline">\`;
    r.steps.forEach((s,i)=>{
      const isLast=i===r.steps.length-1;
      sp+=\`<div class="stp2">
        <div class="stp2-left">
          <div class="stp2-num \${s.status}">\${i+1}</div>
          \${!isLast?\`<div class="stp2-line"></div>\`:''}
        </div>
        <div class="stp2-body \${s.status}">
          <div class="stp2-top">
            <div class="stp2-name">\${esc(s.name)}</div>
            <div class="stp2-dur">\${s.duration}ms</div>
          </div>
          \${s.status==='failed'?\`<div class="stp2-fail-badge">&#9889; Failing Step</div>\`:''}
          \${s.error?\`<div class="stp2-err">\${esc(s.error)}</div>\`:''}
        </div>
      </div>\`;
    });
    sp+='</div></div>';
    html+=sp;
  }

  /* ╔╗ EVIDENCE PANE ╗╗ */
  if(r.attachments.length){
    const aj=JSON.stringify(r.attachments).replace(/"/g,'&quot;');
    let ev=\`<div class="tab-pane" id="pane-ev"><div class="att-grid">\${
      r.attachments.map((a,i)=>{
        if(a.type==='screenshot') return\`<div class="att">
          <div class="att-acts">
            <button class="att-btn" onclick="openLB(\${i},\${aj});event.stopPropagation()" title="View">&#128269;</button>
            <button class="att-btn" onclick="dlF('\${a.path}','\${a.name}');event.stopPropagation()" title="Download">&#11015;&#65039;</button>
          </div>
          <img src="\${a.path}" alt="screenshot" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\\\'att-ph\\\\'>&#128444;&#65039;<span>Not found</span></div><div class=\\\\'att-lbl\\\\'>Screenshot</div>'" onclick="openLB(\${i},\${aj})">
          <div class="att-lbl">Screenshot \${i+1}</div>
        </div>\`;
        if(a.type==='video') return\`<div class="att">
          <div class="att-acts"><button class="att-btn" onclick="dlF('\${a.path}','\${a.name}');event.stopPropagation()" title="Download">&#11015;&#65039;</button></div>
          <video controls preload="metadata"><source src="\${a.path}" type="\${a.contentType||'video/webm'}"></video>
          <div class="att-lbl">Video Recording</div>
        </div>\`;
        return\`<div class="att" onclick="window.open('\${a.path}','_blank')">
          <div class="att-ph">&#128196;<span>\${esc(a.name)}</span></div>
          <div class="att-lbl">\${esc(a.name)}</div>
        </div>\`;
      }).join('')
    }</div></div>\`;
    html+=ev;
  }

  return html;
}

/* ─── Error Forensics Pane Builder ─── */
function buildForensicsPane(r){
  const isFail=r.status==='failed'||r.status==='timedOut';
  if(!isFail)return '';
  const ai=r.error&&r.error.aiAnalysis;
  const f=parseForensics(r);
  const errorTypeMap={
    'Timeout Error':{icon:'&#9203;',color:'#f59e0b',desc:'An operation waited too long for an element or network response.'},
    'Locator Not Found':{icon:'&#128269;',color:'#ef4444',desc:'The selector could not find any matching element in the DOM.'},
    'Assertion Failure':{icon:'&#10060;',color:'#ef4444',desc:'An expect() assertion produced a mismatch between actual and expected values.'},
    'Network Error':{icon:'&#127760;',color:'#f97316',desc:'A network request failed, was refused, or returned an unexpected response.'},
    'Visibility Issue':{icon:'&#128065;',color:'#f59e0b',desc:'The element exists but is hidden, obscured, or not in the visible viewport.'},
    'Javascript Error':{icon:'&#129302;',color:'#fbbf24',desc:'An uncaught JavaScript exception occurred during test execution.'},
    'Authentication Error':{icon:'&#128272;',color:'#8b5cf6',desc:'Credentials or session tokens were rejected by the server.'},
    'Configuration Error':{icon:'&#9881;&#65039;',color:'#6b7280',desc:'The test or environment setup is misconfigured.'},
  };
  const cat=ai&&ai.category?ai.category:'';
  const typeInfo=errorTypeMap[cat]||{icon:'&#9888;&#65039;',color:'#ef4444',desc:cat||'An unexpected error stopped this test.'};
  let h=\`<div class="tab-pane" id="pane-ef"><div class="ef-pane">\`;
  h+=\`<div class="ef-why">
    <div class="ef-why-hdr">
      <span class="ef-why-icon">\${typeInfo.icon}</span>
      <div>
        <div class="ef-why-title">\${esc(cat||'Test Failed')}</div>
        <div class="ef-why-sub">\${esc(typeInfo.desc)}</div>
      </div>
      \${ai&&ai.severity?\`<span class="sev-badge \${ai.severity}" style="margin-left:auto">\${ai.severity.toUpperCase()}</span>\`:''}
    </div>
    <div class="ef-why-body">
      <div class="ef-loc-grid">
        \${f.spec?\`<div class="ef-loc-card spec"><div class="ef-loc-lbl">&#128196; Spec File</div><div class="ef-loc-val" title="\${esc(f.spec)}">\${esc(f.spec)}</div></div>\`:''}
        \${f.line?\`<div class="ef-loc-card linecol"><div class="ef-loc-lbl">&#128205; Line : Column</div><div class="ef-loc-val">\${f.line}\${f.col?':'+f.col:''}</div></div>\`:''}
        \${f.stepNum?\`<div class="ef-loc-card step"><div class="ef-loc-lbl">&#128290; Failing Step</div><div class="ef-loc-val">Step \${f.stepNum} of \${r.steps.length}</div></div>\`:''}
        \${cat?\`<div class="ef-loc-card etype"><div class="ef-loc-lbl">&#9889; Error Type</div><div class="ef-loc-val">\${esc(cat)}</div></div>\`:''}
      </div>
      \${f.stepName?\`<div><div class="ef-section-label">&#9889; Failing Step Action</div><div class="ef-locator-box"><span class="ef-loc-icon">&#9654;</span><div class="ef-loc-text">\${esc(f.stepName)}</div></div></div>\`:''}
      \${f.locator?\`<div><div class="ef-section-label">&#127919; Failing Locator / Selector</div><div class="ef-locator-box"><span class="ef-loc-icon">&#128269;</span><div class="ef-loc-text">\${esc(f.locator)}</div></div></div>\`:''}
      \${ai&&ai.rootCause?\`<div><div class="ef-section-label">&#129504; Why This Error Occurred</div><div class="ef-msg-box" style="color:#c4b5fd;background:rgba(124,58,237,0.06);border-color:rgba(168,85,247,0.25)">\${esc(ai.rootCause)}</div></div>\`:''}
      \${r.error?\`<div><div class="ef-section-label">&#10060; Error Message</div><div class="ef-msg-box">\${esc(r.error.message||'')}</div></div>\`:''}
      \${r.error&&r.error.stack?\`<div>
        <div class="ef-stk-wrap">
          <div class="ef-stk-bar">
            <span class="ef-stk-title">&#128218; Stack Trace\${f.spec?' — highlighted lines are YOUR test file':''}</span>
            <button class="ef-stk-copy" onclick="cpStack(this,\${JSON.stringify(r.error.stack||'').replace(/"/g,'&quot;')})">Copy</button>
          </div>
          <div class="ef-stk-body">\${highlightStack(r.error.stack||'',f.spec)}</div>
        </div>
      </div>\`:''}
    </div>
  </div>\`;
  h+=\`</div></div>\`;
  return h;
}

/* ─── Fix Guide Pane Builder ─── */
function buildFixGuidePane(r){
  const ai=r.error&&r.error.aiAnalysis;
  if(!ai)return '';
  const rawSteps=(ai.suggestion||'').trim();
  const approaches=rawSteps.split(/\n+/).map(s=>s.replace(/^\\d+[.)\\-]\\s*/,'').trim()).filter(Boolean);
  const prevRaw=(ai.prevention||'').trim();
  const prevItems=prevRaw?prevRaw.split(/\n+/).map(s=>s.replace(/^[•\\-*]\\s*/,'').trim()).filter(Boolean):[];
  let h=\`<div class="tab-pane" id="pane-fg"><div class="fg-pane">\`;
  h+=\`<div class="fg-header">
    <div class="fg-title">&#128295; Fix Guide &mdash; \${esc(ai.category)}</div>
    \${ai.estimatedFixTime?\`<div class="fg-time-badge">&#9201; \${esc(ai.estimatedFixTime)} estimated</div>\`:''}
  </div>\`;
  if(approaches.length){
    const approachTitles=['Check &amp; Update Selector / Locator','Add Explicit Wait / Timeout Handling','Verify Test Data &amp; Environment','Review &amp; Refactor Test Logic'];
    h+=\`<div class="fg-approaches">\${approaches.map((a,i)=>{
      const title=approachTitles[i]||('Approach '+(i+1));
      return \`<div class="fg-approach">
        <div class="fg-approach-hdr"><span class="fg-num">\${i+1}</span><span class="fg-approach-title">\${esc(title)}</span></div>
        <div class="fg-approach-body">\${esc(a)}</div>
      </div>\`;
    }).join('')}</div>\`;
  }
  if(ai.fixExample){
    h+=\`<div class="fg-code-wrap">
      <div class="fg-code-hdr">
        <span class="fg-code-lang">&#128187; TypeScript/Playwright &mdash; Code Fix Example</span>
        <button class="fg-code-copy" id="fgc_\${r.testId}" onclick="cpFix('\${r.testId}');event.stopPropagation()">Copy</button>
      </div>
      <div class="fg-code-body" id="fc_\${r.testId}">\${esc(ai.fixExample)}</div>
    </div>\`;
  }
  if(prevItems.length){
    h+=\`<div class="fg-prevention">
      <div class="fg-prev-title">&#128737;&#65039; How to Prevent This in the Future</div>
      <div class="fg-prev-list">\${prevItems.map(p=>\`<div class="fg-prev-item"><div class="fg-prev-dot"></div><div>\${esc(p)}</div></div>\`).join('')}</div>
    </div>\`;
  }
  if(ai.tags&&ai.tags.length){
    h+=\`<div class="fg-tags">\${ai.tags.map(t=>\`<span class="fg-tag">#\${esc(t)}</span>\`).join('')}</div>\`;
  }
  h+=\`</div></div>\`;
  return h;
}

/* â”€â”€ Helpers â”€â”€ */
function esc(t){if(t==null)return'';const d=document.createElement('div');d.textContent=String(t);return d.innerHTML;}
function tglStk(b){
  const s=b.nextElementSibling;
  s.classList.toggle('open');
  const open=s.classList.contains('open');
  b.querySelector('svg').style.transform=open?'rotate(180deg)':'';
  b.childNodes[b.childNodes.length-1].textContent=open?' Hide Stack Trace':' Show Stack Trace';
}
function cpFix(id){
  const e=document.getElementById('fc_'+id);
  if(!e)return;
  navigator.clipboard.writeText(e.textContent).then(()=>{
    const b=e.parentElement.querySelector('.copy-btn');
    if(b){b.textContent='âœ“ Copied!';setTimeout(()=>b.textContent='Copy',2000);}
  });
}
function dlF(p,n){
  fetch(p).then(r=>{if(!r.ok)throw 0;return r.blob();}).then(b=>{
    const u=URL.createObjectURL(b),a=document.createElement('a');
    a.href=u;a.download=n||'file';document.body.appendChild(a);a.click();
    document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(u),100);
  }).catch(()=>alert('File not available'));
}

/* â”€â”€ Lightbox â”€â”€ */
let lbA=[],lbI=0;
function openLB(i,a){lbA=typeof a==='string'?JSON.parse(a.replace(/&quot;/g,'"')):a;lbI=i;rLB();document.getElementById('lb').classList.add('open');}
function closeLB(){document.getElementById('lb').classList.remove('open');const v=document.querySelector('#lbM video');if(v)v.pause();}
function navLB(d){lbI=Math.max(0,Math.min(lbA.length-1,lbI+d));rLB();}
function rLB(){
  const a=lbA[lbI],m=document.getElementById('lbM');
  if(a.type==='screenshot')m.innerHTML=\`<img src="\${a.path}" alt="screenshot">\`;
  else if(a.type==='video')m.innerHTML=\`<video controls autoplay style="max-width:100%;max-height:88vh"><source src="\${a.path}" type="\${a.contentType||'video/webm'}"></video>\`;
  document.getElementById('lbC').textContent=(lbI+1)+' / '+lbA.length;
  document.getElementById('lbP').style.display=lbI===0?'none':'flex';
  document.getElementById('lbN').style.display=lbI===lbA.length-1?'none':'flex';
}

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeDr();closeLB();}
  if(document.getElementById('lb').classList.contains('open')){
    if(e.key==='ArrowLeft')navLB(-1);
    if(e.key==='ArrowRight')navLB(1);
  }
});
</script>
</body>
</html>`;

        const outputPath = path.join(this.outputFolder, 'index.html');
        fs.writeFileSync(outputPath, html, 'utf-8');
        console.log('HTML report generated: ' + outputPath);
    }
}
