# Git Patterns

Git workflows, commands, and recovery patterns. Practical reference for day-to-day work.

## How to Use This File

1. **Daily work**: Quick reference for common operations
2. **Recovery**: When things go wrong, check Reflog and Recovery section
3. **Collaboration**: Guidelines for branches, merges, PRs
4. **Debugging**: Git bisect and blame patterns

---

## Rebase vs Merge

### When to Rebase

**Use rebase for:**

- Cleaning up local commits before pushing
- Updating feature branch with main
- Keeping linear history on feature branches
- Squashing work-in-progress commits

```bash
# Update feature branch with latest main
git checkout feature-branch
git fetch origin
git rebase origin/main

# If conflicts, resolve then continue
git add .
git rebase --continue

# Or abort if things go wrong
git rebase --abort
```

### When to Merge

**Use merge for:**

- Integrating feature branches into main
- Preserving branch history for audit
- Collaborative branches where others have pulled

```bash
# Merge feature into main
git checkout main
git merge feature-branch

# Merge with no fast-forward (creates merge commit)
git merge --no-ff feature-branch

# Squash merge (all commits become one)
git merge --squash feature-branch
git commit -m "feat: add feature X"
```

### The Golden Rule

**Never rebase public/shared branches.** If others have pulled the branch, rebasing rewrites history they depend on.

```bash
# SAFE - rebasing local commits not yet pushed
git rebase -i HEAD~3

# DANGEROUS - rebasing after push
git push --force  # 🚩 Breaks everyone else's checkout
git push --force-with-lease  # Safer, but still dangerous on shared branches
```

---

## Interactive Rebase

### Cleaning Up Commits

```bash
# Rebase last 5 commits
git rebase -i HEAD~5

# Rebase from branch point
git rebase -i main
```

**Interactive rebase options:**

```
pick   - keep commit as-is
reword - change commit message
edit   - stop to amend commit
squash - meld into previous commit
fixup  - like squash but discard message
drop   - remove commit
```

### Common Workflows

```bash
# Squash all commits into one
git rebase -i main
# Change all but first 'pick' to 'squash'

# Reorder commits
git rebase -i HEAD~3
# Move lines to reorder

# Split a commit
git rebase -i HEAD~3
# Mark commit as 'edit', then:
git reset HEAD~
git add -p  # Stage in parts
git commit -m "first part"
git add .
git commit -m "second part"
git rebase --continue
```

### Fixup Commits

```bash
# Create a fixup commit for an earlier commit
git commit --fixup=abc123

# Later, auto-squash all fixups
git rebase -i --autosquash main
```

---

## Git Bisect

### Finding the Bug

```bash
# Start bisecting
git bisect start

# Mark current state
git bisect bad  # Current commit is broken

# Mark known good commit
git bisect good v1.0.0  # This version worked

# Git checks out middle commit
# Test if bug exists, then:
git bisect good  # Bug not present
# or
git bisect bad   # Bug is present

# Repeat until found
# Git tells you the first bad commit

# Clean up when done
git bisect reset
```

### Automated Bisect

```bash
# Run a test script automatically
git bisect start HEAD v1.0.0
git bisect run npm test

# Or with a custom script
git bisect run ./test-for-bug.sh

# Script should exit 0 for good, 1 for bad
```

### Bisect with Skip

```bash
# If a commit can't be tested (build broken, etc.)
git bisect skip

# Skip a range of commits
git bisect skip v1.0.0..v1.0.5
```

---

## Git Worktrees

### Why Worktrees

**Problem:** Need to work on multiple branches simultaneously without stashing or committing WIP.

**Solution:** Git worktrees create separate working directories sharing the same repo.

```bash
# Create worktree for a branch
git worktree add ../project-hotfix hotfix-branch

# Create worktree with new branch
git worktree add -b feature-x ../project-feature-x main

# List worktrees
git worktree list

# Remove worktree when done
git worktree remove ../project-hotfix
```

### Worktree Workflow

```bash
# Main repo structure
~/projects/myapp/           # main branch
~/projects/myapp-feature/   # feature branch
~/projects/myapp-hotfix/    # hotfix branch

# Work in parallel without switching
cd ~/projects/myapp-feature
# ... work on feature ...

cd ~/projects/myapp-hotfix
# ... fix bug ...

cd ~/projects/myapp
# ... continue main work ...
```

### Worktree with OpenCode

```bash
# Create worktree for a bead task
bd=$(bd ready --json | jq -r '.[0].id')
git worktree add -b "bd/$bd" "../$(basename $PWD)-$bd" main

# Work in isolated worktree
cd "../$(basename $PWD)-$bd"
bd start "$bd"
# ... do work ...

# Clean up when done
cd ..
git worktree remove "./$(basename $PWD)-$bd"
```

---

## Stash Workflows

### Basic Stash

```bash
# Stash current changes
git stash

# Stash with message
git stash save "WIP: feature description"

# Stash including untracked files
git stash -u
git stash --include-untracked

# Stash everything including ignored
git stash -a
git stash --all
```

### Managing Stashes

```bash
# List stashes
git stash list

# Apply most recent stash (keep in stash)
git stash apply

# Apply and remove from stash
git stash pop

# Apply specific stash
git stash apply stash@{2}

# Show stash contents
git stash show -p stash@{0}

# Drop a stash
git stash drop stash@{1}

# Clear all stashes
git stash clear
```

### Stash Specific Files

```bash
# Stash only specific files
git stash push -m "partial stash" path/to/file1.ts path/to/file2.ts

# Stash with patch (interactive)
git stash -p
```

### Creating Branch from Stash

```bash
# Create branch from stash
git stash branch new-feature-branch stash@{0}
# Checks out commit where stash was created,
# creates branch, applies stash, drops stash
```

---

## Cherry-Pick

### Basic Cherry-Pick

```bash
# Apply a specific commit to current branch
git cherry-pick abc123

# Cherry-pick multiple commits
git cherry-pick abc123 def456 ghi789

# Cherry-pick a range (exclusive start, inclusive end)
git cherry-pick abc123..def456

# Cherry-pick without committing (stage only)
git cherry-pick -n abc123
```

### Cherry-Pick Strategies

```bash
# Continue after resolving conflicts
git cherry-pick --continue

# Abort cherry-pick
git cherry-pick --abort

# Skip current commit and continue
git cherry-pick --skip

# Preserve original author
git cherry-pick -x abc123  # Adds "(cherry picked from commit ...)"
```

### When to Cherry-Pick

**Good uses:**

- Backporting bug fixes to release branches
- Pulling specific commits from abandoned branches
- Applying hotfixes across versions

**Avoid when:**

- You need all commits from a branch (merge instead)
- Commits have dependencies on other commits

---

## Reflog and Recovery

### The Safety Net

**Reflog records every change to HEAD.** Even "deleted" commits are recoverable for ~90 days.

```bash
# View reflog
git reflog

# Output shows:
# abc123 HEAD@{0}: commit: add feature
# def456 HEAD@{1}: checkout: moving from main to feature
# ghi789 HEAD@{2}: rebase: finished
```

### Recovery Patterns

```bash
# Recover from bad rebase
git reflog
# Find the commit before rebase started
git reset --hard HEAD@{5}

# Recover deleted branch
git reflog
# Find last commit on that branch
git checkout -b recovered-branch abc123

# Recover dropped stash
git fsck --no-reflog | grep commit
# Find orphaned commits, create branch from them

# Undo a reset
git reset --hard HEAD@{1}

# Recover amended commit's original
git reflog
git show HEAD@{1}  # See original before amend
```

### Dangerous Operations and Recovery

```bash
# BEFORE doing something scary, note current HEAD
git rev-parse HEAD  # Save this hash somewhere

# If something goes wrong
git reset --hard <saved-hash>
```

---

## Commit Message Conventions

### Conventional Commits

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes bug nor adds feature
- `perf`: Performance improvement
- `test`: Adding or fixing tests
- `chore`: Build process, tools, dependencies
- `ci`: CI configuration
- `revert`: Revert previous commit

### Examples

```bash
# Simple
git commit -m "feat: add user authentication"
git commit -m "fix: resolve race condition in cache"
git commit -m "docs: update API documentation"

# With scope
git commit -m "feat(auth): add OAuth2 support"
git commit -m "fix(api): handle null response from server"

# With body
git commit -m "refactor(db): optimize query performance

Reduce N+1 queries in user listing by eager loading
associations. Improves response time by 60%."

# Breaking change
git commit -m "feat(api)!: change response format

BREAKING CHANGE: API now returns { data, meta } wrapper
instead of raw array."

# With issue reference
git commit -m "fix(auth): session timeout handling

Fixes #123"
```

### Beads Integration

```bash
# Reference bead in commit
git commit -m "feat: add search functionality

Implements full-text search with Elasticsearch.

Bead: bd-abc123"

# Multiple beads
git commit -m "fix: resolve conflicts in merge

Fixes bd-def456
Related: bd-ghi789"
```

---

## Advanced Patterns

### Partial Staging

```bash
# Stage parts of a file interactively
git add -p

# Options:
# y - stage this hunk
# n - skip this hunk
# s - split into smaller hunks
# e - manually edit hunk
# q - quit

# Unstage parts
git reset -p

# Checkout parts (discard changes)
git checkout -p
```

### Finding Things

```bash
# Find commit by message
git log --grep="search term"

# Find commits that changed a string
git log -S "function_name" --source --all

# Find commits that changed a file
git log --follow -- path/to/file

# Find who changed a line
git blame path/to/file
git blame -L 10,20 path/to/file  # Lines 10-20

# Find when line was introduced
git log -p -S "the exact line" -- path/to/file
```

### Cleaning Up

```bash
# Remove untracked files (dry run)
git clean -n

# Remove untracked files
git clean -f

# Remove untracked files and directories
git clean -fd

# Remove ignored files too
git clean -fdx

# Interactive clean
git clean -i
```

### Rewriting History

```bash
# Change last commit message
git commit --amend -m "new message"

# Add to last commit without changing message
git add forgotten-file.ts
git commit --amend --no-edit

# Change author of last commit
git commit --amend --author="Name <email@example.com>"

# Reset author to current config
git commit --amend --reset-author
```

### Tags

```bash
# Create lightweight tag
git tag v1.0.0

# Create annotated tag (recommended)
git tag -a v1.0.0 -m "Release version 1.0.0"

# Tag specific commit
git tag -a v1.0.0 abc123 -m "Release"

# Push tags
git push origin v1.0.0
git push --tags  # All tags

# Delete tag
git tag -d v1.0.0
git push origin --delete v1.0.0
```

---

## Useful Aliases

Add to `~/.gitconfig`:

```ini
[alias]
  # Shortcuts
  co = checkout
  br = branch
  ci = commit
  st = status

  # Logging
  lg = log --oneline --graph --decorate
  ll = log --oneline -15
  recent = branch --sort=-committerdate --format='%(committerdate:relative)%09%(refname:short)'

  # Working with changes
  unstage = reset HEAD --
  discard = checkout --
  amend = commit --amend --no-edit

  # Diffs
  staged = diff --cached
  both = diff HEAD

  # Stash shortcuts
  ss = stash save
  sp = stash pop
  sl = stash list

  # Branch cleanup
  gone = "!git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -d"

  # Find stuff
  find = "!git log --all --source -S"

  # Sync with upstream
  sync = "!git fetch origin && git rebase origin/main"
```

---

## Troubleshooting

### Merge Conflicts

```bash
# See conflicted files
git status

# Use mergetool
git mergetool

# Accept theirs completely
git checkout --theirs path/to/file

# Accept ours completely
git checkout --ours path/to/file

# Abort merge
git merge --abort
```

### Detached HEAD

```bash
# You're not on a branch
# To save your work:
git checkout -b new-branch-name

# To discard and go back to a branch:
git checkout main
```

### Undoing Things

```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes unstaged
git reset HEAD~1
git reset --mixed HEAD~1  # Same thing

# Undo last commit, discard changes
git reset --hard HEAD~1

# Undo a pushed commit (creates new commit)
git revert abc123

# Undo a merge commit
git revert -m 1 abc123  # Keep main branch's side
```

### Push Rejected

```bash
# Remote has new commits
git pull --rebase origin main
git push

# Branch protection won't allow push
# Create PR instead, or check branch rules

# Force push needed (only on your own branches!)
git push --force-with-lease
```

---

## Adding New Patterns

When you discover a new git pattern:

1. **Identify the situation**: What problem were you solving?
2. **Document the commands**: Step-by-step with explanations
3. **Note warnings**: What could go wrong?
4. **Show recovery**: How to undo if needed

```markdown
### Pattern Name

**Situation:** When you need to...

\`\`\`bash

# Commands with explanations

git command --flag # What this does
\`\`\`

**Gotcha:** Watch out for...

**Recovery:** If something goes wrong...
```
