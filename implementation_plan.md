# Implementation Plan: Fix UI and Content Visibility Issues

The user reported "not able to view full content" and shared screenshots showing invisible text in dark mode and inconsistent filtering results. This plan addresses these issues by improving text contrast, fixing the status filtering logic, and enhancing the detail panel accessibility.

## User Review Required

> [!IMPORTANT]
> - I will change the title rendering from strict truncation to a multi-line wrap (max 2 lines) to ensure more "content" is visible on the card.
> - I will adjust the "Failed" filter to include "timedOut" status, aligning it with the header statistics.

## Proposed Changes

### Reporting UI (`App.tsx`)

#### [MODIFY] [App.tsx](file:///c:/Users/Admin/Desktop/BackUp File/playvision/src/html/report-ui/src/App.tsx)

- **Fix Filter Logic**: Update `filteredResults` to group `failed` and `timedOut` under the `failed` status filter.
- **Fix Text Visibility**:
    - Add explicit `text-white/90` (dark) and `text-slate-800` (light) colors to `TestCard` titles.
    - Improve metadata text contrast (suite name, duration labels).
- **Enhance Layout**:
    - Remove `truncate` from `TestCard` titles; use `line-clamp-2` or similar multi-line wrapping.
    - Adjust `isCompact` mode to still show key metadata if possible, or ensure the drawer interaction is highly discoverable.
- **Spec Category Design**: Ensure `SpecGroupCard` headers are clearly legible in both themes.

## Verification Plan

### Automated Tests
- Run `npm run build` to verify the UI compilation.
- Use the browser subagent to:
    1.  Verify that clicking the "Failed" filter correctly shows both "failed" and "timedOut" tests.
    2.  Verify that test titles are visible in both Dark and Light modes.
    3.  Verify that clicking a test card (even in Tree View) reliably opens the detail drawer.

### Manual Verification
- Check screen captures to ensure no "invisible text" remains.
