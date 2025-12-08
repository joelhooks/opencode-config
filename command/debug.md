---
description: Investigate an error - gather context, trace cause, suggest fix
---

Debug mode. Given an error message, stack trace, or description, investigate and find the cause.

## Usage

```
/debug <error message or description>
/debug --save  (save novel pattern after fixing)
/debug  (will ask for error details)
```

The error/context is: $ARGUMENTS

## Step 1: Check Known Patterns FIRST

Before investigating, search the error patterns knowledge base:

```bash
# Extract key terms from error and search
rg -i "<error keywords>" ~/.config/opencode/knowledge/error-patterns.md -B 2 -A 15
```

**If match found:**

```markdown
## Known Error Pattern Detected

**Pattern:** <pattern name>
**Known Fix:** <fix from knowledge base>

Applying known fix...
```

Skip to Step 6 (Verify) after applying. Don't waste time investigating known issues.

**If no match:** Continue to Step 2 for full investigation.

## Step 2: Parse the Error

If no error provided, ask:

```
What error are you seeing? Paste:
- Error message
- Stack trace
- Console output
- Or describe the unexpected behavior
```

Extract from the error:

- **Error type** (TypeError, SyntaxError, runtime, build, etc.)
- **File:line** if present
- **Function/component** involved
- **Key values** mentioned

## Step 3: Locate Ground Zero

```bash
# If we have a file:line, read it
# read <file> around the line number

# If we have a function name, find it
rg "function <name>|const <name>|<name>\s*=" src/ -l

# If we have a component name
rg "export.*(function|const|class)\s+<Name>" src/ -l
```

## Step 4: Reproduce Context

```bash
# Recent changes that might have caused this
git diff HEAD~5 --stat
git log --oneline -5

# Current branch state
git status --short

# Check if it's a type error
pnpm exec tsc --noEmit 2>&1 | head -30

# Check if it's a runtime error in tests
pnpm test --run 2>&1 | tail -50 || true
```

## Step 5: Trace the Error

Based on error type:

### Type Error

```bash
# Find the type definition
rg "type <TypeName>|interface <TypeName>" src/ -A 5

# Find usages
rg "<TypeName>" src/ -l
```

### Undefined/Null Error

```bash
# Find where the variable is defined
rg "<varName>\s*=" src/ -B 2 -A 2

# Find where it's used
rg "<varName>" src/ -l
```

### Import/Module Error

```bash
# Check if the export exists
rg "export.*(function|const|class|type)\s+<Name>" src/

# Check the import path
rg "from ['\"].*<module>['\"]" src/ -l
```

### React/Component Error

```bash
# Find the component
rg "export.*(function|const)\s+<Component>" src/ -A 20

# Find usages
rg "<Component" src/ -l
```

## Step 6: Identify Root Cause

Read the relevant files and trace the data flow:

1. Where does the problematic value originate?
2. What transformations does it go through?
3. What assumptions are being violated?

Common patterns:

- **Async timing** - data not ready when accessed
- **Type mismatch** - expecting X, got Y
- **Missing null check** - optional value used as required
- **Stale closure** - capturing old value
- **Import cycle** - circular dependency
- **Environment** - missing env var or config

## Step 7: Verify Hypothesis

Before suggesting fix, verify:

```bash
# Check if the suspected cause matches the error location
# Read the file, trace the logic
```

## Step 8: Present Findings

Format your findings:

```
## Debug Report

### Error
<original error>

### Root Cause
<1-2 sentence explanation of WHY this happened>

### Location
<file>:<line> - <function/component>

### The Problem
<code snippet>

### Why It Fails
<explanation of the logic error>

### Suggested Fix
<corrected code>

### Prevention
- <how to prevent this class of bug in future>
```

## Step 9: Offer to Fix

```
Want me to apply this fix? (y/n)
```

If yes, use Edit tool to apply the fix, then verify:

```bash
pnpm exec tsc --noEmit
pnpm test --run 2>&1 | tail -20 || true
```

## Step 10: Save Novel Pattern (if --save or novel error)

If this was a **novel error** (not in `error-patterns.md`), offer to save it:

```
This error pattern isn't in the knowledge base. Save it for future reference? (y/n)
```

If yes (or if `--save` flag was passed):

1. **Format the pattern**:

   ```markdown
   ### <Error Name/Code>

   **Pattern:** `<regex-friendly error message>`

   **Common Causes:**

   - <root cause discovered>

   **Fixes:**
   \`\`\`typescript
   <the fix that worked>
   \`\`\`

   **Prevention:** <how to avoid this>
   ```

2. **Add to knowledge base**:
   - Identify the correct section in `~/.config/opencode/knowledge/error-patterns.md`
   - Append the new pattern under that section

3. **File a tracking bead**:

   ```bash
   bd create "Error pattern: <brief description>" -t chore --tags error-pattern --json
   ```

4. **Report**:

   ```markdown
   ## Pattern Saved

   Added to: `~/.config/opencode/knowledge/error-patterns.md`
   Section: <section name>
   Bead: <bd-id>

   Future `/debug` calls will recognize this pattern and apply the fix automatically.
   ```

This creates a self-improving debug system - each novel error you solve makes the next occurrence instant.

## When to Use /debug-plus

Use `/debug-plus` instead of `/debug` when:

- **Multi-file investigation** - error spans 3+ files or involves shared types
- **Recurring patterns** - you've seen this class of error before
- **Systemic issues** - investigation reveals missing infrastructure (error boundaries, validation, etc.)
- **Prevention needed** - you want to fix the root cause across the codebase, not just this instance

`/debug-plus` extends this command with:

- Swarm integration for parallel investigation
- Automatic prevention pattern matching via `knowledge/prevention-patterns.md`
- Prevention bead creation for follow-up work
- Optional swarm spawning for codebase-wide preventive fixes

For simple single-file bugs, `/debug` is faster. For anything systemic, use `/debug-plus`.
