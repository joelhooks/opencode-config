# Linear for Vercel Academy (Education Team)

> **Linear is the source of truth.** Notion is deprecated for content tracking.

## The Key Insight

**DX Deliverable** is the magic label. Add it to ANY issue and it shows up in the content calendar.

```
Issue (any team) + "DX Deliverable" label → Content Calendar
```

## Education Team

| Name | Email | Linear ID | Notion ID | Slack ID |
|------|-------|-----------|-----------|----------|
| Joel Hooks | joel.hooks@vercel.com | `47b94c47-f82f-4110-b7f1-9432ab567de3` | `1a7d872b-594c-81ed-9a54-0002a3193d1b` | `U08FCNRDY0J` |
| Eve Porcello | eve.porcello@vercel.com | `cf8edf1a-34d6-4d73-8e42-7536acf179ee` | `28fd872b-594c-8120-bc67-00024e0f4521` | `U09LZ68M67Q` |

## Your Context

- **Team**: Education (EDU-*)
- **Team ID**: `3913aea8-c6df-4fcf-ab46-caba08f1ea6c`
- **Site**: vercel.com/academy
- **Slack Channel**: `#academy` (`C08UMBNDZ6G`)

## Collaborators (Cross-Team)

| Name | Email | Linear ID | Slack ID | Expertise |
|------|-------|-----------|----------|-----------|
| Hayden Bleasel | hayden.bleasel@vercel.com | `e8258444-62fa-4557-ac9b-f18f55bfb23c` | - | shadcn/ui, design systems |
| Drew Bredvick | dbredvick@vercel.com | `c64a8541-6605-4649-9487-025402aad9fd` | `U028DSQRZ6U` | AI, enterprise patterns |
| Jimmy Lai | jimmy.lai@vercel.com | `6ecc995a-d2b0-4e0c-b351-ad2f3dd2caed` | - | Performance, profiling |
| Dom Sipowicz | dom@vercel.com | `132089fc-73a1-4423-bb70-c98a5a55e0b3` | - | Enterprise deployments, v0, flags |
| Daniel Roe | daniel.roe@vercel.com | `7269eae3-1018-4d91-9f7f-829a688038ae` | - | Nuxt, Vue ecosystem |
| Dominic Ferber | - | - | - | Flags SDK creator |

## Documentation Team Collaborators

| Name | Email | Linear ID | Notion ID | Focus |
|------|-------|-----------|-----------|-------|
| Delba de Oliveira | delba.oliveira@vercel.com | `162d1ea2-3763-4f7b-9b3e-dc7d34d7095a` | `54c94858-2934-4931-ae79-06b9c111928a` | Next.js Education, Cache Comps |
| Amy Burns | amy.burns@vercel.com | `79473979-bade-4346-880d-3a0c3b4efda6` | `00f52499-a6a5-4b5b-97b4-c1be4026299d` | Docs platform, Getting started |
| Ismael Rumzan | ismael@vercel.com | `28a6cbf0-d706-4850-874e-585a4c0f7d93` | `53de7174-7d58-47a0-b6bc-d662c0b5b2db` | Knowledge base, CDN docs |
| Anthony Shew | anthony.shew@vercel.com | `bb0b2640-bce8-4468-bf23-79033d74ad1a` | `7d7d9288-a649-4ef7-96af-8026539da217` | Code examples, Turborepo |
| Nico Albanese | nico.albanese@vercel.com | `3f70c170-45cb-493e-ba4a-08937b0f89eb` | `3878be83-e05c-4e8a-8bbf-aeff821e10ac` | AI SDK education |

## Quick Actions

### Check Education Team Work

```
# My assigned issues
linear_list_issues(assignee="me")

# Eve's assigned issues
linear_list_issues(assignee="eve.porcello@vercel.com")

# All DX Deliverables (content calendar items)
linear_list_issues(team="Education", label="DX Deliverable")

# Just courses
linear_list_issues(team="Education", label="Course")

# Education team overview (natural language)
linear_query_data(query="Issues assigned to Joel Hooks or Eve Porcello")
```

### Create Academy Course

**ALWAYS add DX Deliverable to get on the content calendar:**

```
linear_create_issue(
  team="Education",
  title="[Course Name] Course",
  description="## Overview\n\n## Learning Outcomes\n\n## Modules\n\n## Target Audience",
  labels=["Course", "DX Deliverable"]
)
```

### Natural Language Queries

```
# Content calendar overview
linear_query_data(query="All DX Deliverable issues due this week")

# My content
linear_query_data(query="Issues assigned to Joel with DX Deliverable label")

# Academy-specific
linear_query_data(query="Issues mentioning Academy or Course")
```

## Labels

### Required for Content Calendar

| Label | ID | Note |
|-------|-----|------|
| **DX Deliverable** | `6b3d7451-e2b0-4b69-a27e-486845b95dd5` | **ADD THIS TO EVERYTHING** |

### Content Type Labels

| Label | ID | Use For |
|-------|-----|---------|
| Course | `3315ba45-f5b2-4bb9-950a-8cd6ea5b259a` | Academy courses |
| Blog | `4b41c668-65dc-4ebd-ae80-071ea8d0911e` | Blog posts |
| Social Post | `29286dc7-0311-428a-855b-234f0b0f19dd` | Twitter, LinkedIn, Bluesky |
| Video | `efdef145-2a7f-4ac2-b1a4-1ee6f6dc5c81` | Video content |
| Guide or Tutorial | `3836ebc4-c457-46dc-9eb6-23081baf4353` | Standalone tutorials |
| Demo or Example | `367a6973-c306-434b-a330-04135ee6d12e` | Code examples |

### Topic Labels

| Label | ID |
|-------|-----|
| AI | `8fb7f72a-e024-4510-9238-98caa47307f1` |
| area:next | `347ff051-3f2e-4d67-ba95-de6af6139941` |

## Workflow States

```
Triage → Backlog → Todo → In Progress → In Draft → In Review → Done
```

| State | ID |
|-------|-----|
| Backlog | `b46ceef4-89bf-44bb-b368-c1441006eca4` |
| Todo | `90d01a28-3805-4c37-a534-fb0283c598a5` |
| In Progress | `bad70e2d-7b96-49e5-9d0a-7d6d2db6cfee` |
| In Draft | `0b4c8cb9-3411-4b08-ac33-3e968690c48b` |
| In Review | `36bc1f68-a336-4ba4-b53f-d2e071b90a38` |
| Done | `5a2cc380-14d6-41b1-b8d7-6275e2f88b98` |

## Relevant Projects

| Project | ID | Focus |
|---------|-----|-------|
| AI SDK Education Pipeline | `5cf81552-48aa-42c3-854d-9cc5c9deddfe` | AI SDK content |
| Cache Components | `8a07a35a-0e73-4663-bbcf-2fa3d4b4393f` | Cache Components education |
| Turbopack Engineering | `7924e3d4-4996-4493-9c14-938bbeb7c491` | Turbopack blogs |
| Engineering Blogs | `9508cd00-9391-416d-9d9d-40003a09f274` | Technical blogs |
| Next.js Skills / Agents DX | `ddb1b139-10e1-46a5-bb7c-0233b9fe36ae` | Skills for agents |
| Education Strategy | `d8a90053-24dc-4d99-afc9-05a7902ef765` | Strategy planning |

## Current Courses (Jan 2026)

### Shipped
| Issue | Title | Owner |
|-------|-------|-------|
| EDU-1 | React UI with shadcn/ui + Radix + Tailwind | Hayden |
| EDU-2 | Vercel AI SDK Fundamentals | Joel |
| EDU-3 | Slack Agents Course | Joel |
| EDU-4 | Production Monorepos with Turborepo | Eve |
| EDU-5 | Subscription Store with Vercel and Stripe | Eve |
| EDU-6 | AI Summary App with Next.js | Eve |

### In Progress
| Issue | Title | Owner | Target |
|-------|-------|-------|--------|
| EDU-7 | Next.js Foundations | Joel | Beta live, glossary added |
| EDU-8 | Microfrontends on Vercel | Eve | Feb 5, 2026 |
| EDU-9 | Filesystem Agents | Eve | Feb 11, 2026 |
| EDU-10 | Building Intelligent Agents with AI SDK | Joel | Feb 15, 2026 |
| EDU-16 | Svelte on Vercel | Eve | TBD (Rich Harris collab) |

### Backlog
| Issue | Title | Owner | Notes |
|-------|-------|-------|-------|
| EDU-12 | v0 to Hero | Joel | Mar 15 - Dom's workshop → course |
| EDU-14 | Profiling with Jimmy Lai | - | Needs scheduling |
| EDU-15 | Nuxt on Vercel | Eve | Daniel Roe collab |

## Multi-Course Projects

### Advanced Next.js Deployment (EDU-13 Restructured)

Major restructure into 4-course series with Dom Sipowicz as SME:

| Issue | Title | Status |
|-------|-------|--------|
| EDU-17 | Shared Example (Turbo Repo Base) | **BLOCKS ALL** |
| EDU-18 | Feature Flags on Vercel | Blocked |
| EDU-19 | Rolling Release on Vercel | Blocked |
| EDU-20 | Skew Protection on Vercel | Blocked |

### Project Structure Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  LINEAR PROJECT: [Topic Name]                               │
│  (Groups related work with shared goal)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔧 [TOPIC]-0: Shared Example Base                         │
│     └─ Dev work (code, repo setup)                         │
│     └─ BLOCKS all courses below                            │
│     └─ Label: "Demo or Example"                            │
│                                                             │
│  📚 [TOPIC]-1: Course Name A                               │
│     └─ BLOCKED BY [TOPIC]-0                                │
│     └─ Labels: "Course", "DX Deliverable"                  │
│                                                             │
│  📚 [TOPIC]-2: Course Name B                               │
│     └─ BLOCKED BY [TOPIC]-0                                │
│     └─ Labels: "Course", "DX Deliverable"                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Slack Integration

### Mining #academy for Intel

```bash
# Get recent channel history
slack_slack_get_channel_history(channel_id="C08UMBNDZ6G", limit=50)

# Look up a user by ID
slack_slack_get_user_profile(user_id="U...")
```

### Slack URL Format

Timestamp `1769114468.646389` → URL: `https://vercel.slack.com/archives/C08UMBNDZ6G/p1769114468646389`

(Remove the dot from timestamp, prefix with `p`)

### What to Extract from Slack

- **Ship dates** - "we shipped X on [date]"
- **Blockers** - "waiting on Y before we can..."
- **Collaborator mentions** - who's working on what
- **Target dates** - "aiming for [date]"
- **Status updates** - progress, pivots, scope changes

## Course Template

```markdown
## Overview

[What is this course about?]

## Target Audience

[Who is this for? Skill level?]

## Learning Outcomes

By the end of this course, learners will:

- [ ] Outcome 1
- [ ] Outcome 2
- [ ] Outcome 3

## Modules

1. Module 1: [Title]
2. Module 2: [Title]
3. Module 3: [Title]

## Prerequisites

- [Required knowledge]

## Timeline

- [ ] Outline
- [ ] Content draft
- [ ] Review
- [ ] Production
- [ ] Launch

## Links

- Repo: [course repo]
- Academy URL: vercel.com/academy/[slug]
- Draft URL: vercel.com/academy/draft/[slug]
```

## Workflows

### Add to Content Calendar

1. Create or find issue
2. Add `DX Deliverable` label
3. Set due date
4. Issue appears in content calendar

### Weekly Review

```
# What's due this week
linear_query_data(query="DX Deliverable issues due this week assigned to me")

# What's in progress
linear_list_issues(assignee="me", state="In Progress")

# What's in review
linear_list_issues(assignee="me", state="In Review")
```

### New Course Workflow

1. Create issue: `linear_create_issue(team="Education", title="...", labels=["Course", "DX Deliverable"])`
2. Add to relevant project
3. Set due date
4. Move through: Backlog → Todo → In Progress → In Draft → In Review → Done

## Tips

- **DX Deliverable = content calendar** - always add this label for visibility
- Use `linear_query_data` for complex date-based queries
- Link Academy courses to their GitHub repos
- Sub-issues work well for course modules
- **Mine Slack regularly** - that's where real status lives

## Legacy: Notion References (Deprecated)

> **DO NOT USE NOTION for new work.** These references exist for historical context only.

### Old Notion Databases (Read-Only Reference)

| Database | Collection ID | Notes |
|----------|---------------|-------|
| Academy Course Pipeline | `collection://292e06b0-59c4-80b3-93ea-000bdeff1d9e` | Migrated to Linear |
| DX Deliverables | `collection://2b7e06b0-59c4-8041-bcad-000b4b0d5ab4` | Use Linear DX Deliverable label |
| Campaign Planning | `collection://2bfe06b0-59c4-8006-91e1-000bdea543cb` | Migrated to Linear |
