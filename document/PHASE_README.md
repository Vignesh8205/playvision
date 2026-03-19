# PlayVision Reporter - Development Phases

**Project:** PlayVision Reporter  
**Goal:** Build a custom, lightweight, AI-powered HTML reporting engine for Playwright.  
**Total Estimated Timeline:** 24–31 Days

---

## Phase 1: Requirements & Foundation (Days 1-2)

**Objective:** Establish the project scope, core objectives, and initial repository structure.

### 1.1 Define Core Objectives
- [ ] **Lightweight Engine:** No external servers or heavy dependencies.
- [ ] **Asset Capture:** Screenshots, videos, traces, console logs.
- [ ] **AI Analysis:** Intelligent error classification and fix suggestions.
- [ ] **Parallel Execution:** Support for Playwright sharding/workers.

### 1.2 Project Initialization
- [ ] Initialize Node.js project (`npm init`).
- [ ] Configure TypeScript (`tsconfig.json`).
- [ ] Set up ESLint/Prettier.
- [ ] Create folder structure:
  ```text
  playvision/
  ├─ src/
  │   ├─ core/        (Reporter Engine)
  │   ├─ collector/   (Event & Asset Collectors)
  │   ├─ html/        (HTML Generation)
  │   ├─ ai/          (Error Analysis)
  │   ├─ schema/      (Types & Interfaces)
  │   └─ utils/       (Helpers)
  ├─ ui/              (Frontend Report Template)
  │   ├─ index.html
  │   ├─ styles.css
  │   └─ viewer.js
  ```

---

## Phase 2: Architecture & Design (Days 3-5)

**Objective:** Define the data models, interfaces, and data flow between modules.

### 2.1 Data Modeling
- [ ] Define **Result JSON Schema** (Section 10 of Plan).
  - `testId`, `title`, `status`, `duration`.
  - `steps` array with timestamps.
  - `attachments` (screenshots, videos).
  - `error` object with AI suggestion fields.
- [ ] Define internal event models for the `Event Collector`.

### 2.2 Module Interface Design
- [ ] Design **Reporter Engine** interface (implements Playwright Reporter).
- [ ] Design **Asset Collector** API for saving files.
- [ ] Design **AI Analyzer** input/output signatures.

### 2.3 Workflow Mapping
- [ ] Map the flow: `Test Start` -> `Event Capture` -> `Asset Save` -> `JSON Serialization` -> `HTML Generation`.

---

## Phase 3: Core Engine Development (Days 6-19)

**Objective:** Implement the backend logic for capturing and processing test results.

### 3.1 Reporter Engine (src/core)
- [ ] Implement `onBegin`: Initialize counters and timers.
- [ ] Implement `onTestBegin`: Register new test execution.
- [ ] Implement `onStepBegin` / `onStepEnd`: Track step hierarchy.
- [ ] Implement `onTestEnd`: Finalize test status and duration.
- [ ] Implement `onEnd`: Trigger report generation.

### 3.2 Event Collector (src/collector)
- [ ] Create logic to buffer events from multiple workers.
- [ ] Handle test retries (grouping attempts).
- [ ] Capture console logs and standard output.

### 3.3 Asset Collector (src/collector)
- [ ] Implement logic to copy screenshots/videos to `playvision-report/assets/`.
- [ ] Ensure unique naming to prevent overwrites in parallel runs.
- [ ] Link assets to specific test IDs in the JSON model.

### 3.4 AI Error Analyzer (src/ai)
- [ ] Implement Regex/String matching for common errors:
  - `LocatorNotFoundError`
  - `TimeoutError`
  - `AssertionError`
  - `NetworkError`
- [ ] Create a knowledge base of "Fix Suggestions" for each category.
- [ ] Implement function to inject `aiSuggestion` into the error object.

### 3.5 Data Serializer (src/core)
- [ ] Implement `writeResults()` to dump the in-memory model to `results.json`.
- [ ] Ensure atomic writes or proper merging if using multiple processes.

---

## Phase 4: UI Development (Days 20-26)

**Objective:** Create the visual HTML report that consumes the JSON data.

### 4.1 HTML Structure (ui/index.html)
- [ ] Create a single-page application (SPA) shell.
- [ ] Embed `results.json` payload (or load via fetch).

### 4.2 Dashboard View
- [ ] Implement Summary Cards: Total, Passed, Failed, Flaky, Skipped.
- [ ] Implement Execution Chart (Pie/Bar).
- [ ] Show Worker Distribution stats.

### 4.3 Test List & Filters
- [ ] Create a searchable/filterable list of tests.
- [ ] Implement filters for Status, Suite, and Duration.

### 4.4 Test Detail View
- [ ] Display Test Title and Metadata.
- [ ] Render Step-by-Step execution log.
- [ ] **Error Section:** Highlight error message + **AI Suggestion**.
- [ ] **Attachments:** Embed Screenshots and Video player.
- [ ] **Retry Tab:** Compare previous attempts if retries occurred.

### 4.5 Styling
- [ ] Apply modern CSS (Flexbox/Grid).
- [ ] Ensure responsive design.
- [ ] (Optional) Implement Dark Mode toggle.

---

## Phase 5: Testing & Optimization (Days 27-30)

**Objective:** Validate performance, accuracy, and reliability.

### 5.1 Functional Testing
- [ ] Verify all Playwright hooks (`onTestBegin`, etc.) fire correctly.
- [ ] Verify assets are correctly linked to tests.
- [ ] Verify AI Analyzer correctly classifies induced errors.

### 5.2 Performance Testing
- [ ] Run with a suite of 300+ tests.
- [ ] Ensure report generation takes < 3 seconds.
- [ ] Verify memory usage during large runs.

### 5.3 Parallel Execution Verification
- [ ] Run tests with `fullyParallel: true` and multiple workers.
- [ ] Confirm no race conditions in file writing.
- [ ] Confirm results from all workers are merged correctly.

---

## Phase 6: Release & Documentation (Day 31)

**Objective:** Prepare for distribution.

### 6.1 Documentation
- [ ] Write `README.md` with installation and config instructions.
- [ ] Document the `playwright.config.ts` setup.

### 6.2 Packaging
- [ ] Finalize `package.json` (version, description, keywords).
- [ ] Run `npm pack` to test the tarball.
- [ ] Publish to NPM (if applicable).

---
