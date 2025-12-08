---
description: Pattern migration across codebase using refactorer agent
---

Find and replace patterns across the codebase with tracking.

## Usage

```
/migrate <from-pattern> <to-pattern>
/migrate "console.log" "logger.debug"
/migrate "import { foo } from 'old-pkg'" "import { foo } from 'new-pkg'"
/migrate --dry-run "oldFunction" "newFunction"
```

## Step 1: Parse Arguments

Extract from `$ARGUMENTS`:

- `<from-pattern>` - The pattern to find (can be literal string or regex)
- `<to-pattern>` - The replacement pattern
- `--dry-run` - Preview changes without applying

## Step 2: Find All Occurrences

Use grep to find all files containing the pattern:

```bash
rg --files-with-matches "<from-pattern>" --type-add 'code:*.{ts,tsx,js,jsx,mjs,cjs}' -t code
```

Or for more structural patterns, use ast-grep:

```
repo-autopsy_ast with pattern="<from-pattern>", lang="typescript"
```

## Step 3: Create Migration Bead

```bash
bd create "Migrate: <from-pattern> -> <to-pattern>" -t chore -p 2 --json
```

Save the bead ID for tracking.

## Step 4: Assess Impact

Count occurrences and affected files:

```bash
rg --count "<from-pattern>" --type-add 'code:*.{ts,tsx,js,jsx,mjs,cjs}' -t code
```

If more than 10 files affected, consider:

- Breaking into batches
- Using swarm for parallel execution
- Getting confirmation before proceeding

## Step 5: Execute Migration

### For Simple Patterns (literal replacement)

Use the refactorer agent:

```
Task(
  subagent_type="refactorer",
  description="Migrate pattern across codebase",
  prompt="Find all occurrences of '<from-pattern>' and replace with '<to-pattern>'.

  Files to process:
  [list from Step 2]

  Rules:
  - Preserve formatting and indentation
  - Update imports if needed
  - Don't change comments or strings unless explicitly part of pattern
  - Run type check after changes"
)
```

### For Complex Patterns (structural)

Use ast-grep rules or manual refactoring:

```yaml
# ast-grep rule
id: migrate-pattern
language: typescript
rule:
  pattern: <from-pattern>
fix: <to-pattern>
```

### Dry Run Mode

If `--dry-run` was specified, only show what would change:

```bash
rg "<from-pattern>" --type-add 'code:*.{ts,tsx,js,jsx,mjs,cjs}' -t code -C 2
```

Output preview and stop.

## Step 6: Verify Migration

```bash
# Type check
pnpm tsc --noEmit

# Run tests
pnpm test --run

# Verify no occurrences remain (unless intentional)
rg "<from-pattern>" --type-add 'code:*.{ts,tsx,js,jsx,mjs,cjs}' -t code || echo "Migration complete - no occurrences found"
```

## Step 7: Update Bead and Commit

```bash
# Update bead with results
bd update $BEAD_ID -d "Migrated N occurrences across M files"

# Commit changes
git add .
git commit -m "refactor: migrate <from-pattern> to <to-pattern>

Refs: $BEAD_ID"

# Close bead
bd close $BEAD_ID --reason "Migrated N occurrences across M files"
```

## Step 8: Report Results

```markdown
## Migration Complete

### Pattern

`<from-pattern>` -> `<to-pattern>`

### Impact

- Files changed: [N]
- Occurrences replaced: [N]

### Files Modified

- [file1.ts]
- [file2.ts]
- ...

### Verification

- Type check: [PASS/FAIL]
- Tests: [PASS/FAIL]
- Remaining occurrences: [0 or list exceptions]

### Bead

[bead-id] - Closed

### Commit

[commit-hash]
```

## Common Migration Patterns

```bash
# Import path changes
/migrate "from 'old-package'" "from 'new-package'"

# Function renames
/migrate "oldFunctionName(" "newFunctionName("

# API changes
/migrate ".then(data =>" ".then((data) =>"

# Deprecation replacements
/migrate "deprecated.method()" "newApi.method()"
```

## Tips

- Always run `--dry-run` first for large migrations
- Check git diff before committing
- Consider semantic impact, not just textual replacement
- Some patterns need manual review (e.g., overloaded function names)
- Use ast-grep for structural patterns to avoid false positives in strings/comments
