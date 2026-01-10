# Decomposition Strategies

Four strategies for breaking tasks into parallelizable subtasks. The coordinator auto-selects based on task keywords, or you can specify explicitly.

## File-Based Strategy

**Best for:** Refactoring, migrations, pattern changes across codebase

**Keywords:** refactor, migrate, update all, rename, replace, convert, upgrade, deprecate, remove, cleanup, lint, format

### Guidelines

- Group files by directory or type (e.g., all components, all tests)
- Minimize cross-directory dependencies within a subtask
- Handle shared types/utilities FIRST if they change
- Each subtask should be a complete transformation of its file set
- Consider import/export relationships when grouping

### Anti-Patterns

- Don't split tightly coupled files across subtasks
- Don't group files that have no relationship
- Don't forget to update imports when moving/renaming

### Examples

| Task                                | Decomposition                                 |
| ----------------------------------- | --------------------------------------------- |
| Migrate all components to new API   | Split by component directory                  |
| Rename `userId` to `accountId`      | Split by module (types first, then consumers) |
| Update all tests to use new matcher | Split by test directory                       |

---

## Feature-Based Strategy

**Best for:** New features, adding functionality, vertical slices

**Keywords:** add, implement, build, create, feature, new, integrate, connect, enable, support

### Guidelines

- Each subtask is a complete vertical slice (UI + logic + data)
- Start with data layer/types, then logic, then UI
- Keep related components together (form + validation + submission)
- Separate concerns that can be developed independently
- Consider user-facing features as natural boundaries

### Anti-Patterns

- Don't split a single feature across multiple subtasks
- Don't create subtasks that can't be tested independently
- Don't forget integration points between features

### Examples

| Task            | Decomposition                                        |
| --------------- | ---------------------------------------------------- |
| Add user auth   | [OAuth setup, Session management, Protected routes]  |
| Build dashboard | [Data fetching, Chart components, Layout/navigation] |
| Add search      | [Search API, Search UI, Results display]             |

---

## Risk-Based Strategy

**Best for:** Bug fixes, security issues, critical changes, hotfixes

**Keywords:** fix, bug, security, vulnerability, critical, urgent, hotfix, patch, audit, review

### Guidelines

- Write tests FIRST to capture expected behavior
- Isolate the risky change to minimize blast radius
- Add monitoring/logging around the change
- Create rollback plan as part of the task
- Audit similar code for the same issue

### Anti-Patterns

- Don't make multiple risky changes in one subtask
- Don't skip tests for "simple" fixes
- Don't forget to check for similar issues elsewhere

### Examples

| Task               | Decomposition                                                             |
| ------------------ | ------------------------------------------------------------------------- |
| Fix auth bypass    | [Add regression test, Fix vulnerability, Audit similar endpoints]         |
| Fix race condition | [Add test reproducing issue, Implement fix, Add concurrency tests]        |
| Security audit     | [Scan for vulnerabilities, Fix critical issues, Document remaining risks] |

---

## Research-Based Strategy

**Best for:** Investigation, learning, discovery, debugging options

**Keywords:** research, investigate, explore, find out, discover, understand, learn about, analyze, compare, evaluate, study, debug options, configuration options

### Guidelines

- Split by information source (PDFs, repos, history, web)
- Each agent searches with different query angles
- Include a synthesis subtask that depends on all search subtasks
- Use pdf-brain for documentation/books if available
- Use repo-crawl for GitHub repos if URL provided
- Use CASS for past agent session history
- Assign NO files to research subtasks (read-only)

### Anti-Patterns

- Don't have one agent search everything sequentially
- Don't skip synthesis - raw search results need consolidation
- Don't forget to check tool availability before assigning sources

### Examples

| Task                   | Decomposition                                                                |
| ---------------------- | ---------------------------------------------------------------------------- |
| Research auth patterns | [Search PDFs, Search repos, Search history, Synthesize]                      |
| Investigate error      | [Search CASS for similar errors, Search repo for error handling, Synthesize] |
| Learn about library    | [Search docs, Search examples, Search issues, Synthesize findings]           |

---

## Strategy Selection

The coordinator auto-selects strategy by matching task keywords. Override with explicit strategy when:

- Task spans multiple categories (e.g., "fix bug and add feature")
- You have domain knowledge the keywords don't capture
- Past experience suggests a different approach

```
swarm_plan_prompt(task="...", strategy="risk-based")  // explicit override
swarm_plan_prompt(task="...")                          // auto-select
```
