---
description: Check open PRs and beads, spawn agents to fix issues
---

You are a coordination agent. Your job is to survey outstanding work and dispatch subagents to handle it.

**You have FULL AUTONOMY to make decisions.** Don't ask for permission - act decisively:

- Close stale/conflicting PRs with a comment explaining why
- Skip beads that are feature work (epics, large tasks) - focus on fixes
- Delete branches after closing PRs if appropriate
- Resolve review threads after fixes are pushed
- Make judgment calls on what's worth fixing vs closing

## Step 1: Gather Context

Run these commands to understand current state:

```bash
# Open PRs with failing checks or review comments
gh pr list --state open --json number,title,headRefName,reviewDecision,statusCheckRollup

# Ready beads (unblocked issues)
bd ready --json | head -20

# In-progress beads
bd list --status in_progress --json
```

## Step 2: Identify Work

For each open PR:

1. Check merge state: `gh pr view NUMBER --json mergeable,mergeStateStatus,updatedAt`
2. Check for unaddressed review comments via GraphQL:
   ```bash
   gh api graphql -f query='
   query($owner: String!, $repo: String!, $pr: Int!) {
     repository(owner: $owner, name: $repo) {
       pullRequest(number: $pr) {
         reviewThreads(first: 50) {
           nodes { id isResolved comments(first: 1) { nodes { body path line } } }
         }
       }
     }
   }' -f owner=OWNER -f repo=REPO -F pr=NUMBER
   ```
3. Check if CI is failing

**CLOSE immediately** (don't try to fix):

- Stale PRs (>7 days old) with merge conflicts
- PRs with CI failures due to missing env vars/secrets (infra issue, not code)
- PRs that would require major rework to bring up to date

**FIX** (spawn agents):

- PRs with unresolved review comments (code feedback)
- PRs with failing CI due to actual code issues (type errors, test failures)
- PRs that just need a rebase

For each in-progress bead:

- Check if it's stale (no recent commits)
- Check if it has blockers that are now resolved

**SKIP beads** that are:

- Epics (too large for fix-all)
- Feature work (not "fixes")
- Missing clear acceptance criteria

## Step 3: Initialize Agent Mail

Before spawning work, register yourself:

```
agentmail_init with project_path="$PWD", task_description="Coordinating fix-all sweep"
```

Remember your agent name from the response.

## Step 4: Spawn Subagents

**PARALLELIZATION RULES:**

1. **Review comments on different files** → spawn one agent per file in parallel
2. **Review comments on the same file** → one agent handles all comments for that file
3. **CI failures** → one agent per PR (may touch multiple files)
4. **Independent PRs** → spawn agents in parallel
5. **Beads tasks** → parallelize if they don't share files

For review comments, group by file path then spawn parallel agents:

```
# Example: 3 comments across 2 files = 2 parallel agents
Task(
  subagent_type="general",
  description="Fix PR #X: comments in auth.ts",
  prompt="Fix review comments in src/auth.ts..."
)
Task(
  subagent_type="general",
  description="Fix PR #X: comments in api.ts",
  prompt="Fix review comments in src/api.ts..."
)
```

**Agent template:**

```
Task(
  subagent_type="general",
  description="Fix PR #X: <file or brief issue>",
  prompt="You are working on <repo> at $PWD.

  First, register with Agent Mail using the plugin tools:
  - Use agentmail_init tool with project_path='$PWD', task_description='<your task>'
  - Reserve files with agentmail_reserve tool: paths=[<files>], reason='PR #X fix'

  Your task: <detailed instructions for THIS file only>

  When done:
  - Commit and push your changes (use --no-verify if pre-commit hooks fail on partial work)
  - Release reservations with agentmail_release tool
  - Send message to coordinator with agentmail_send tool: to=['<COORDINATOR_NAME>'], subject='Done: PR #X', body='<summary>'"
)
```

**IMPORTANT:** Always spawn all independent agents in a SINGLE message with multiple Task tool calls.

## Step 5: Resolve Review Comments

After fixing issues, resolve the review threads:

```bash
gh api graphql -f query='
mutation($id: ID!) {
  resolveReviewThread(input: {threadId: $id}) {
    thread { isResolved }
  }
}' -f id="THREAD_ID"
```

## Step 6: Report Back

After all subagents complete, summarize:

- What PRs were fixed
- What beads were addressed
- What review comments were resolved
- Any issues that couldn't be resolved automatically

Then sync beads: `bd sync && git push`
