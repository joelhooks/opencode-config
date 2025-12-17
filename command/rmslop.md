---
description: Remove AI code slop from current branch
---

Check the diff against the main branch and remove all AI-generated slop introduced in this branch.

This includes:

- Extra comments that a human wouldn't add or are inconsistent with the rest of the file
- Extra defensive checks or try/catch blocks abnormal for that area of the codebase (especially if called by trusted/validated codepaths)
- Casts to `any` to get around type issues
- Any style inconsistent with the file
- Unnecessary emoji usage
- Over-verbose variable names that don't match the codebase style
- Redundant type annotations where inference would work
- Overly defensive null checks where the type system already guarantees non-null
- Console.log statements left in production code
- Commented-out code blocks

**Process:**

1. Run `git diff main...HEAD` to see all changes on this branch
2. For each file, compare the changes against the existing code style
3. Remove slop while preserving the actual functionality
4. Do NOT remove legitimate error handling or comments that add value

Report at the end with only a 1-3 sentence summary of what you changed.
