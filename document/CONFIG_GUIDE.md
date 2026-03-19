# Configuration-Based AI Analysis

## Overview
All AI error analysis configuration is now externalized to `error-config.json`, making it fully reusable and easy to customize without touching the code.

## Configuration File: `src/ai/error-config.json`

### Structure
```json
{
  "categories": [...],      // Error categories
  "suggestions": {...},     // Fix suggestions for each category
  "fixExamples": {...},     // Code examples
  "patterns": {...}         // Regex patterns for classification
}
```

### How to Customize

#### 1. Add a New Error Category
```json
{
  "categories": [
    "Locator Not Found",
    "Custom Database Error"  // Add new category
  ]
}
```

#### 2. Add Pattern for Detection
```json
{
  "patterns": {
    "Custom Database Error": "database.*connection|ECONNREFUSED.*db"
  }
}
```

#### 3. Add Suggestion
```json
{
  "suggestions": {
    "Custom Database Error": "Check database connection string and credentials"
  }
}
```

#### 4. Add Fix Example (Optional)
```json
{
  "fixExamples": {
    "Custom Database Error": "await db.connect({ retry: 3 });"
  }
}
```

## Benefits

✅ **No Code Changes** - Update error handling without modifying TypeScript  
✅ **Easy Maintenance** - All configuration in one place  
✅ **Version Control** - Track changes to error patterns  
✅ **Team Collaboration** - Non-developers can update suggestions  
✅ **Environment-Specific** - Different configs for different projects  

## Example: Custom Configuration

You can even load different configurations:

```typescript
// For a specific project
const customConfig = require('./custom-error-config.json');
```

Or override at runtime:

```typescript
const analyzer = new RuleBasedAnalyzer();
// Configuration is loaded automatically from error-config.json
```

## Migration from Hardcoded

**Before:**
- Hardcoded arrays and objects in TypeScript
- Required code changes for updates
- Difficult to customize per project

**After:**
- JSON configuration file
- Update without recompiling
- Easy to share and version
