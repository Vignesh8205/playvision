import * as fs from 'fs';
import * as path from 'path';
import { TestResult, ReportMetadata } from '../schema/types';
import { IHTMLRenderer } from './interfaces';

export class HTMLRenderer implements IHTMLRenderer {
  private outputFolder: string;

  constructor(outputFolder: string) {
    this.outputFolder = outputFolder;
  }

  async generate(results: TestResult[], metadata: ReportMetadata): Promise<void> {
    console.log('🎨 Generating HTML report...');

    const htmlContent = this.generateHTML(results, metadata);
    const cssContent = this.generateCSS();
    const jsContent = this.generateJS();

    // Write files
    fs.writeFileSync(path.join(this.outputFolder, 'index.html'), htmlContent);
    fs.writeFileSync(path.join(this.outputFolder, 'styles.css'), cssContent);
    fs.writeFileSync(path.join(this.outputFolder, 'viewer.js'), jsContent);

    console.log(`✅ HTML report generated at: ${this.outputFolder}/index.html`);
  }

  private generateHTML(results: TestResult[], metadata: ReportMetadata): string {
    const passRate = metadata.totalTests > 0
      ? ((metadata.passed / metadata.totalTests) * 100).toFixed(1)
      : '0.0';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlayVision Report - ${new Date(metadata.endTime).toLocaleDateString()}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="header-content">
        <h1>🎭 PlayVision Reporter</h1>
        <p class="subtitle">AI-Powered Test Results</p>
      </div>
      <div class="header-meta">
        <span class="meta-item">📅 ${new Date(metadata.endTime).toLocaleString()}</span>
        <span class="meta-item">⚡ ${metadata.workers} worker${metadata.workers !== 1 ? 's' : ''}</span>
        <span class="meta-item">⏱️ ${(metadata.duration / 1000).toFixed(2)}s</span>
      </div>
    </header>

    <div class="dashboard-grid">
        <div class="stats-container">
            <div class="stat-card total">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                <div class="stat-value">${metadata.totalTests}</div>
                <div class="stat-label">Total Tests</div>
                </div>
            </div>
            <div class="stat-card passed">
                <div class="stat-icon">✅</div>
                <div class="stat-content">
                <div class="stat-value">${metadata.passed}</div>
                <div class="stat-label">Passed</div>
                </div>
            </div>
            <div class="stat-card failed">
                <div class="stat-icon">❌</div>
                <div class="stat-content">
                <div class="stat-value">${metadata.failed}</div>
                <div class="stat-label">Failed</div>
                </div>
            </div>
            <div class="stat-card skipped">
                <div class="stat-icon">⏭️</div>
                <div class="stat-content">
                <div class="stat-value">${metadata.skipped}</div>
                <div class="stat-label">Skipped</div>
                </div>
            </div>
        </div>
        
        <div class="chart-container">
            <div class="donut-chart" style="--p:${passRate}">
                <div class="chart-center">
                    <span class="percentage">${passRate}%</span>
                    <span class="label">PASS RATE</span>
                </div>
            </div>
        </div>
    </div>

    <div class="controls">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="search" placeholder="Search tests..." />
      </div>
      <div class="filters">
        <select id="statusFilter">
          <option value="all">All Status</option>
          <option value="passed">✅ Passed</option>
          <option value="failed">❌ Failed</option>
          <option value="skipped">⏭️ Skipped</option>
          <option value="flaky">⚠️ Flaky</option>
        </select>
        <select id="suiteFilter">
          <option value="all">All Suites</option>
        </select>
      </div>
      <button id="darkModeToggle" class="dark-mode-toggle">🌙</button>
    </div>

    <div id="testList" class="test-list"></div>

    <div id="testModal" class="modal">
      <div class="modal-content drawer">
        <span class="modal-close">&times;</span>
        <div id="modalBody"></div>
      </div>
    </div>
  </div>

  <script>
    window.testResults = ${JSON.stringify(results, null, 2)};
    window.metadata = ${JSON.stringify(metadata, null, 2)};
  </script>
  <script src="viewer.js"></script>
</body>
</html>`;
  }

  private generateCSS(): string {
    return `/* PlayVision Reporter Styles - Enhanced */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success-gradient: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  --error-gradient: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  --warning-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --info-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --neutral-gradient: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
  
  --bg-color: #f5f7fa;
  --card-bg: #ffffff;
  --text-primary: #2d3748;
  --text-secondary: #718096;
  --border-color: #e2e8f0;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.15);
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(255, 255, 255, 0.18);
  --font-family: 'Outfit', sans-serif;
}

body.dark-mode {
  --bg-color: #0f172a;
  --card-bg: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e0;
  --border-color: #334155;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.6);
  --glass-bg: rgba(30, 41, 59, 0.7);
  --glass-border: rgba(255, 255, 255, 0.1);
}

body {
  font-family: var(--font-family);
  background: var(--bg-color);
  color: var(--text-primary);
  min-height: 100vh;
  padding: 20px;
  transition: background 0.3s ease, color 0.3s ease;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeInUp 0.6s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
header {
  background: var(--card-bg);
  border-radius: 24px;
  padding: 40px;
  margin-bottom: 30px;
  box-shadow: var(--shadow);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  font-size: 2.2em;
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
  animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(10deg); }
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1em;
  margin-bottom: 0;
}

.header-meta {
  display: flex;
  gap: 15px;
}

.meta-item {
  background: var(--bg-color);
  padding: 10px 20px;
  border-radius: 50px;
  font-size: 0.9em;
  font-weight: 500;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
  border: 1px solid var(--border-color);
}

.meta-item:hover {
  transform: translateY(-2px);
  border-color: #667eea;
}

/* Dashboard Grid */
.dashboard-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    margin-bottom: 30px;
}

@media (max-width: 900px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
}

.stats-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 20px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  box-shadow: var(--shadow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  font-size: 2em;
  margin-bottom: 10px;
  animation: pulse 2s ease-in-out infinite;
}

.stat-value {
  font-size: 2em;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 0.8em;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.stat-card.total .stat-value { color: #667eea; }
.stat-card.passed .stat-value { color: #38ef7d; }
.stat-card.failed .stat-value { color: #f45c43; }
.stat-card.skipped .stat-value { color: #95a5a6; }

/* Chart */
.chart-container {
    background: var(--card-bg);
    border-radius: 20px;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    border: 1px solid var(--glass-border);
    position: relative;
    overflow: hidden;
}

.donut-chart {
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: conic-gradient(#38ef7d calc(var(--p) * 1%), #f5f7fa 0);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 1s ease;
}

body.dark-mode .donut-chart {
    background: conic-gradient(#38ef7d calc(var(--p) * 1%), #334155 0);
}

.chart-center {
    background: var(--card-bg);
    width: 140px;
    height: 140px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.05);
}

.percentage {
  font-size: 2em;
    font-weight: 700;
    color: var(--text-primary);
}

.label {
    font-size: 0.8em;
    color: var(--text-secondary);
    font-weight: 600;
}

/* Controls */
.controls {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 30px;
  display: flex;
  gap: 15px;
  align-items: center;
  box-shadow: var(--shadow);
  flex-wrap: wrap;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
}

.search-box {
  flex: 1;
  min-width: 250px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2em;
  transition: transform 0.3s ease;
}

.search-box:focus-within .search-icon {
  transform: translateY(-50%) scale(1.1);
}

#search {
  width: 100%;
  padding: 12px 20px 12px 45px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  font-size: 1em;
  background: var(--bg-color);
  color: var(--text-primary);
  transition: all 0.3s ease;
  font-family: var(--font-family);
}

#search:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filters {
  display: flex;
  gap: 10px;
}

select {
  padding: 12px 20px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  font-size: 1em;
  background: var(--bg-color);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--font-family);
}

select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

select:hover {
  border-color: #667eea;
}

.dark-mode-toggle {
  padding: 12px 20px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-color);
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark-mode-toggle:hover {
  transform: scale(1.1) rotate(15deg);
  border-color: #667eea;
}

/* Test List */
.test-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.test-item {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 6px solid transparent;
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-item:hover {
  transform: translateX(8px);
  box-shadow: var(--shadow-lg);
}

.test-item.passed { border-left-color: #38ef7d; }
.test-item.failed { border-left-color: #f45c43; }
.test-item.skipped { border-left-color: #95a5a6; }
.test-item.flaky { border-left-color: #f5576c; }

.test-info {
    flex: 1;
}

.test-title {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 5px;
}

.test-suite {
    font-size: 0.9em;
    color: var(--text-secondary);
}

.test-status-badge {
  padding: 8px 16px;
  border-radius: 50px;
  font-size: 0.85em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.test-status-badge.passed { background: rgba(56, 239, 125, 0.15); color: #38ef7d; }
.test-status-badge.failed { background: rgba(244, 92, 67, 0.15); color: #f45c43; }
.test-status-badge.skipped { background: rgba(149, 165, 166, 0.15); color: #95a5a6; }
.test-status-badge.flaky { background: rgba(245, 87, 108, 0.15); color: #f5576c; }

/* Modal (Drawer Style) */
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  right: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
  animation: fadeIn 0.3s ease;
  justify-content: flex-end; /* Align drawer to right */
}

.modal.active {
  display: flex;
}

.modal-content.drawer {
  background: var(--card-bg);
  width: 100%;
  max-width: 800px;
  height: 100vh;
  padding: 40px;
  overflow-y: auto;
  position: relative;
  box-shadow: var(--shadow-lg);
  animation: slideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border-left: 1px solid var(--border-color);
}

@keyframes slideLeft {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.modal-close {
  position: absolute;
  top: 25px;
  right: 25px;
  font-size: 2em;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-color);
}

.modal-close:hover {
  color: var(--text-primary);
  transform: rotate(90deg);
  background: #e2e8f0;
}

.modal-title {
  font-size: 1.6em;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--text-primary);
  padding-right: 50px;
  line-height: 1.2;
}

.modal-section {
  margin-bottom: 35px;
}

.modal-section h3 {
  font-size: 1.1em;
  margin-bottom: 15px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-box {
  background: #fff5f5;
  border-left: 4px solid #f45c43;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

body.dark-mode .error-box {
  background: rgba(239, 68, 68, 0.1);
  border-left-color: #f87171;
}

.error-message {
  font-family: 'Courier New', monospace;
  color: #c53030;
  margin-bottom: 15px;
  white-space: pre-wrap;
  line-height: 1.6;
}

body.dark-mode .error-message {
  color: #fca5a5;
}

.ai-analysis {
  background: var(--bg-color);
  padding: 20px;
  border-radius: 12px;
  margin-top: 15px;
  border: 1px solid var(--border-color);
}

.ai-badge {
  display: inline-block;
  background: var(--primary-gradient);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
  margin-bottom: 10px;
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.ai-category {
  font-weight: 600;
  color: #667eea;
  margin-bottom: 10px;
}

.ai-suggestion {
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 15px;
}

.code-example {
  background: #1a202c;
  color: #f7fafc;
  padding: 15px;
  border-radius: 12px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  overflow-x: auto;
  margin-top: 10px;
  border: 1px solid #2d3748;
}

.steps-list {
  list-style: none;
}

.step-item {
  background: var(--bg-color);
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 10px;
  border-left: 3px solid transparent;
  transition: all 0.3s ease;
}

.step-item:hover {
  transform: translateX(5px);
}

.step-item.passed { border-left-color: #38ef7d; }
.step-item.failed { border-left-color: #f45c43; }

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.step-name {
  font-weight: 600;
  color: var(--text-primary);
}

.step-duration {
  color: var(--text-secondary);
  font-size: 0.9em;
}

/* Attachments */
.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.attachment-item {
  border: 2px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-color);
  position: relative;
}

.attachment-item:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: var(--shadow-lg);
  border-color: #667eea;
}

.attachment-item img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.attachment-item:hover img {
  transform: scale(1.05);
}

.attachment-item video {
  width: 100%;
  height: 150px;
  object-fit: cover;
  background: #000;
}

.attachment-label {
  padding: 12px;
  background: var(--card-bg);
  text-align: center;
  font-size: 0.9em;
  color: var(--text-secondary);
  font-weight: 500;
  border-top: 1px solid var(--border-color);
}

.attachment-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.attachment-item:hover .attachment-actions {
  opacity: 1;
}

.attachment-btn {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2em;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.attachment-btn:hover {
  background: rgba(102, 126, 234, 0.9);
  transform: scale(1.1);
}

/* Lightbox */
.lightbox {
  display: none;
  position: fixed;
  z-index: 2000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  animation: fadeIn 0.3s ease;
}

.lightbox.active {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.lightbox-content {
  max-width: 90%;
  max-height: 90%;
  position: relative;
  animation: zoomIn 0.3s ease;
}

@keyframes zoomIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.lightbox-content img,
.lightbox-content video {
  max-width: 100%;
  max-height: 85vh;
  border-radius: 12px;
  box-shadow: 0 25px 100px rgba(0, 0, 0, 0.5);
}

.lightbox-close {
  position: absolute;
  top: -40px;
  right: 0;
  font-size: 2em;
  color: white;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.1);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 3em;
  color: white;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.1);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.1);
}

.lightbox-nav.prev { left: 20px; }
.lightbox-nav.next { right: 20px; }

.lightbox-caption {
  position: absolute;
  bottom: -40px;
  left: 0;
  right: 0;
  text-align: center;
  color: white;
  font-size: 1.1em;
}

/* Video Player Enhancements */
video {
  outline: none;
}

video::-webkit-media-controls-panel {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
}

/* Loading State */
.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-radius: 50%;
  border-top-color: #667eea;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.media-error {
  width: 100%;
  height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
  color: var(--text-secondary);
  font-size: 0.9em;
}

.media-error-icon {
  font-size: 2em;
  margin-bottom: 10px;
  opacity: 0.5;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .controls {
    flex-direction: column;
  }
  
  .search-box {
    width: 100%;
  }
  
  .filters {
    width: 100%;
    flex-direction: column;
  }
  
  select {
    width: 100%;
  }
  
  .modal-content {
    padding: 20px;
    margin: 10px;
  }
  
  .attachments-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .lightbox-nav {
    width: 50px;
    height: 50px;
    font-size: 2em;
  }
  
  header {
    padding: 20px;
  }
  
  .header-content h1 {
    font-size: 2em;
  }
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 12px;
}

::-webkit-scrollbar-track {
  background: var(--bg-color);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 6px;
  transition: background 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: #667eea;
}
`;
  }

  private generateJS(): string {
    return `// PlayVision Reporter Viewer - Enhanced

class PlayVisionViewer {
  constructor() {
    this.results = window.testResults || [];
    this.metadata = window.metadata || {};
    this.filteredResults = [...this.results];
    this.currentLightboxIndex = 0;
    this.currentAttachments = [];
    this.init();
  }

  init() {
    this.renderTestList();
    this.setupEventListeners();
    this.populateSuiteFilter();
    this.createLightbox();
  }

  setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    statusFilter.addEventListener('change', (e) => this.handleFilter());

    // Suite filter
    const suiteFilter = document.getElementById('suiteFilter');
    suiteFilter.addEventListener('change', (e) => this.handleFilter());

    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    darkModeToggle.addEventListener('click', () => this.toggleDarkMode());

    // Modal close
    const modalClose = document.querySelector('.modal-close');
    modalClose.addEventListener('click', () => this.closeModal());

    // Close modal on outside click
    const modal = document.getElementById('testModal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeLightbox();
      }
      if (document.querySelector('.lightbox.active')) {
        if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
        if (e.key === 'ArrowRight') this.navigateLightbox(1);
      }
    });

    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
      darkModeToggle.textContent = '☀️';
    }
  }

  populateSuiteFilter() {
    const suites = [...new Set(this.results.map(r => r.suite))].filter(Boolean);
    const suiteFilter = document.getElementById('suiteFilter');
    
    suites.forEach(suite => {
      const option = document.createElement('option');
      option.value = suite;
      option.textContent = suite;
      suiteFilter.appendChild(option);
    });
  }

  handleSearch(query) {
    this.filterResults();
  }

  handleFilter() {
    this.filterResults();
  }

  filterResults() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const suiteFilter = document.getElementById('suiteFilter').value;

    this.filteredResults = this.results.filter(result => {
      const matchesSearch = result.title.toLowerCase().includes(searchQuery) ||
                           result.suite.toLowerCase().includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
      const matchesSuite = suiteFilter === 'all' || result.suite === suiteFilter;

      return matchesSearch && matchesStatus && matchesSuite;
    });

    this.renderTestList();
  }

  renderTestList() {
    const testList = document.getElementById('testList');
    
    if (this.filteredResults.length === 0) {
      testList.innerHTML = \`
        <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
          <div style="font-size: 3em; margin-bottom: 20px;">🔍</div>
          <div style="font-size: 1.2em;">No tests found</div>
        </div>
      \`;
      return;
    }

    testList.innerHTML = this.filteredResults.map(result => \`
      <div class="test-item \${result.status}" onclick="viewer.showTestDetail('\${result.testId}')">
        <div class="test-header">
          <div class="test-title">\${this.escapeHtml(result.title)}</div>
          <div class="test-status \${result.status}">\${result.status}</div>
        </div>
        <div class="test-meta">
          <div class="test-meta-item">
            <span>📁</span>
            <span>\${this.escapeHtml(result.suite)}</span>
          </div>
          <div class="test-meta-item">
            <span>⏱️</span>
            <span>\${(result.duration / 1000).toFixed(2)}s</span>
          </div>
          \${result.retries > 0 ? \`
            <div class="test-meta-item">
              <span>🔄</span>
              <span>\${result.retries} retries</span>
            </div>
          \` : ''}
          \${result.error?.aiAnalysis ? \`
            <div class="test-meta-item">
              <span>🤖</span>
              <span>AI Analysis Available</span>
            </div>
          \` : ''}
          \${result.attachments.length > 0 ? \`
            <div class="test-meta-item">
              <span>📎</span>
              <span>\${result.attachments.length} attachment\${result.attachments.length !== 1 ? 's' : ''}</span>
            </div>
          \` : ''}
        </div>
      </div>
    \`).join('');
  }

  showTestDetail(testId) {
    const result = this.results.find(r => r.testId === testId);
    if (!result) return;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = \`
      <h2 class="modal-title">\${this.escapeHtml(result.title)}</h2>
      
      <div class="modal-section">
        <div class="test-meta">
          <div class="test-meta-item">
            <span>📁 Suite:</span>
            <span>\${this.escapeHtml(result.suite)}</span>
          </div>
          <div class="test-meta-item">
            <span>⏱️ Duration:</span>
            <span>\${(result.duration / 1000).toFixed(2)}s</span>
          </div>
          <div class="test-meta-item">
            <span>🔄 Retries:</span>
            <span>\${result.retries}</span>
          </div>
          <div class="test-meta-item">
            <span>📊 Status:</span>
            <span class="test-status \${result.status}">\${result.status}</span>
          </div>
        </div>
      </div>

      \${result.error ? this.renderError(result.error) : ''}
      \${result.steps.length > 0 ? this.renderSteps(result.steps) : ''}
      \${result.attachments.length > 0 ? this.renderAttachments(result.attachments) : ''}
    \`;

    document.getElementById('testModal').classList.add('active');
  }

  renderError(error) {
    // Helper to determine confidence color
    const getConfidenceColor = (score) => {
        if (score >= 0.8) return '#38ef7d'; // Green
        if (score >= 0.5) return '#f6e05e'; // Yellow
        return '#f45c43'; // Red
    };

    const confidenceScore = error.aiAnalysis ? error.aiAnalysis.confidence : 0;
    const confidencePercent = (confidenceScore * 100).toFixed(0);
    const confidenceColor = getConfidenceColor(confidenceScore);

    return \`
      <div class="modal-section">
        <h3>❌ Error Details</h3>
        <div class="error-box" style="border-left: 4px solid #f45c43; background: var(--bg-color); border: 1px solid var(--border-color); border-left-width: 4px;">
          <div class="error-message" style="font-family: monospace; white-space: pre-wrap; color: var(--text-primary); background: rgba(0,0,0,0.03); padding: 15px; border-radius: 8px;">\${this.escapeHtml(error.message)}</div>
          
          \${error.stack ? \`
            <details style="margin-top: 10px; cursor: pointer;">
                <summary style="color: var(--text-secondary); font-size: 0.9em; user-select: none;">View Full Stack Trace</summary>
                <div class="code-example" style="margin-top: 10px; font-size: 0.85em; max-height: 300px; overflow: auto; color: var(--text-secondary);">
                    \${this.escapeHtml(error.stack)}
                </div>
            </details>
          \` : ''}

          \${error.aiAnalysis ? \`
            <div class="ai-analysis" style="margin-top: 20px; border: 1px solid var(--border-color); padding: 20px; border-radius: 12px; background: rgba(102, 126, 234, 0.05);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div class="ai-badge" style="margin: 0;">🤖 AI Analysis</div>
                <div style="display: flex; align-items: center; gap: 10px; font-size: 0.9em; color: var(--text-secondary);">
                    <span>Confidence: \${confidencePercent}%</span>
                    <div style="width: 100px; height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow: hidden;">
                        <div style="width: \${confidencePercent}%; height: 100%; background: \${confidenceColor}; transition: width 0.5s ease;"></div>
                    </div>
                </div>
              </div>

              <div class="ai-category" style="font-size: 1.1em; color: var(--text-primary); margin-bottom: 15px;">
                <strong>Category:</strong> <span style="color: #667eea;">\${this.escapeHtml(error.aiAnalysis.category)}</span>
              </div>
              
              \${error.aiAnalysis.rootCause ? \`
                <div style="margin-bottom: 15px;">
                  <strong style="color: var(--text-primary);">🔍 Root Cause:</strong><br>
                  <div style="color: var(--text-secondary); margin-top: 5px; line-height: 1.6; white-space: pre-wrap;">\${this.escapeHtml(error.aiAnalysis.rootCause)}</div>
                </div>
              \` : ''}

              <div class="ai-suggestion" style="margin-bottom: 15px;">
                <strong style="color: var(--text-primary);">💡 Suggestion:</strong><br>
                <div style="color: var(--text-secondary); margin-top: 5px; line-height: 1.6; white-space: pre-wrap;">\${this.escapeHtml(error.aiAnalysis.suggestion)}</div>
              </div>
              
              \${error.aiAnalysis.fixExample ? \`
                <div>
                  <strong style="color: var(--text-primary);">📝 Fix Example:</strong>
                  <div class="code-example" style="background: #1a202c; color: #a5b3ce; padding: 15px; border-radius: 8px; margin-top: 8px; font-family: monospace; position: relative;">
                    \${this.escapeHtml(error.aiAnalysis.fixExample)}
                    <button onclick="navigator.clipboard.writeText(this.parentElement.innerText.replace('Copy', '').trim()); this.textContent='Copied!'" style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.1); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Copy</button>
                  </div>
                </div>
              \` : ''}
            </div>
          \` : ''}
        </div>
      </div>
    \`;
  }

  renderSteps(steps) {
    return \`
      <div class="modal-section">
        <h3>📋 Execution Steps</h3>
        <ul class="steps-list">
          \${steps.map(step => \`
            <li class="step-item \${step.status}">
              <div class="step-header">
                <div class="step-name">\${this.escapeHtml(step.name)}</div>
                <div class="step-duration">\${step.duration}ms</div>
              </div>
              \${step.error ? \`<div style="color: #f45c43; margin-top: 5px;">\${this.escapeHtml(step.error)}</div>\` : ''}
            </li>
          \`).join('')}
        </ul>
      </div>
    \`;
  }

  renderAttachments(attachments) {
    if (attachments.length === 0) return '';
    
    return \`
      <div class="modal-section">
        <h3>📎 Attachments</h3>
        <div class="attachments-grid">
          \${attachments.map((att, idx) => {
            if (att.type === 'screenshot') {
              return \`
                <div class="attachment-item">
                  <div class="attachment-actions">
                    <button class="attachment-btn" onclick="viewer.downloadMedia('\${att.path}', '\${att.name}')" title="Download">
                      ⬇️
                    </button>
                    <button class="attachment-btn" onclick="viewer.openLightbox(\${idx}, \${JSON.stringify(attachments).replace(/"/g, '&quot;')})" title="View Full Size">
                      🔍
                    </button>
                  </div>
                  <img 
                    src="\${att.path}" 
                    alt="Screenshot" 
                    loading="lazy"
                    onerror="this.parentElement.innerHTML='<div class=\\'media-error\\'><div class=\\'media-error-icon\\'>🖼️</div><div>Image not found</div></div>'"
                    onclick="viewer.openLightbox(\${idx}, \${JSON.stringify(attachments).replace(/"/g, '&quot;')})"
                  >
                  <div class="attachment-label">Screenshot \${idx + 1}</div>
                </div>
              \`;
            } else if (att.type === 'video') {
              return \`
                <div class="attachment-item">
                  <div class="attachment-actions">
                    <button class="attachment-btn" onclick="viewer.downloadMedia('\${att.path}', '\${att.name}')" title="Download">
                      ⬇️
                    </button>
                    <button class="attachment-btn" onclick="viewer.openLightbox(\${idx}, \${JSON.stringify(attachments).replace(/"/g, '&quot;')})" title="View Full Size">
                      🔍
                    </button>
                  </div>
                  <video 
                    controls 
                    preload="metadata"
                    style="width: 100%; height: 150px; object-fit: cover;"
                    onerror="this.parentElement.innerHTML='<div class=\\'media-error\\'><div class=\\'media-error-icon\\'>🎥</div><div>Video not found</div></div>'"
                  >
                    <source src="\${att.path}" type="\${att.contentType || 'video/webm'}">
                    Your browser does not support the video tag.
                  </video>
                  <div class="attachment-label">Video</div>
                </div>
              \`;
            } else {
              return \`
                <div class="attachment-item" onclick="window.open('\${att.path}', '_blank')">
                  <div class="attachment-actions">
                    <button class="attachment-btn" onclick="event.stopPropagation(); viewer.downloadMedia('\${att.path}', '\${att.name}')" title="Download">
                      ⬇️
                    </button>
                  </div>
                  <div style="padding: 50px; text-align: center; font-size: 2em;">📄</div>
                  <div class="attachment-label">\${att.name}</div>
                </div>
              \`;
            }
          }).join('')}
        </div>
      </div>
    \`;
  }

  createLightbox() {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.id = 'lightbox';
    lightbox.innerHTML = \`
      <div class="lightbox-content">
        <span class="lightbox-close" onclick="viewer.closeLightbox()">&times;</span>
        <div class="lightbox-nav prev" onclick="viewer.navigateLightbox(-1)">‹</div>
        <div class="lightbox-nav next" onclick="viewer.navigateLightbox(1)">›</div>
        <div id="lightboxMedia"></div>
        <div class="lightbox-caption" id="lightboxCaption"></div>
      </div>
    \`;
    document.body.appendChild(lightbox);

    // Close on background click
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) this.closeLightbox();
    });
  }

  openLightbox(index, attachments) {
    this.currentAttachments = attachments;
    this.currentLightboxIndex = index;
    this.showLightboxMedia();
    document.getElementById('lightbox').classList.add('active');
  }

  showLightboxMedia() {
    const att = this.currentAttachments[this.currentLightboxIndex];
    const mediaContainer = document.getElementById('lightboxMedia');
    const caption = document.getElementById('lightboxCaption');

    if (att.type === 'screenshot') {
      mediaContainer.innerHTML = \`
        <img 
          src="\${att.path}" 
          alt="Screenshot"
          onerror="this.parentElement.innerHTML='<div class=\\'media-error\\'><div class=\\'media-error-icon\\'>🖼️</div><div>Image not found</div></div>'"
        >
      \`;
      caption.textContent = \`Screenshot \${this.currentLightboxIndex + 1} of \${this.currentAttachments.length}\`;
    } else if (att.type === 'video') {
      mediaContainer.innerHTML = \`
        <video 
          controls 
          autoplay
          onerror="this.parentElement.innerHTML='<div class=\\'media-error\\'><div class=\\'media-error-icon\\'>🎥</div><div>Video not found</div></div>'"
        >
          <source src="\${att.path}" type="\${att.contentType || 'video/webm'}">
          Your browser does not support the video tag.
        </video>
      \`;
      caption.textContent = \`Video \${this.currentLightboxIndex + 1} of \${this.currentAttachments.length}\`;
    }

    // Update navigation visibility
    const prevBtn = document.querySelector('.lightbox-nav.prev');
    const nextBtn = document.querySelector('.lightbox-nav.next');
    prevBtn.style.display = this.currentLightboxIndex === 0 ? 'none' : 'flex';
    nextBtn.style.display = this.currentLightboxIndex === this.currentAttachments.length - 1 ? 'none' : 'flex';
  }

  navigateLightbox(direction) {
    this.currentLightboxIndex += direction;
    if (this.currentLightboxIndex < 0) this.currentLightboxIndex = 0;
    if (this.currentLightboxIndex >= this.currentAttachments.length) {
      this.currentLightboxIndex = this.currentAttachments.length - 1;
    }
    this.showLightboxMedia();
  }

  closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    // Pause any playing videos
    const video = lightbox.querySelector('video');
    if (video) video.pause();
  }

  downloadMedia(path, name) {
    // Fetch the file and create a blob URL for download
    fetch(path)
      .then(response => {
        if (!response.ok) throw new Error('File not found');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Clean up the object URL after a short delay
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      })
      .catch(error => {
        console.error('Download failed:', error);
        alert('Failed to download file. The file may not exist.');
      });
  }

  closeModal() {
    document.getElementById('testModal').classList.remove('active');
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    document.getElementById('darkModeToggle').textContent = isDark ? '☀️' : '🌙';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize viewer
const viewer = new PlayVisionViewer();
`;
  }
}
