# Weekly Team Update Skill

> Build narrative weekly updates for manager reports by gathering data from multiple sources and synthesizing into a story-driven format.

## Overview

This skill documents the process for creating detailed weekly team updates that tell a story about what the team accomplished, why it matters, and challenges overcome.

**Key Insight from Timothy:** "I'd really like to add more detail and make these updates a bit longer so we can tell more of a story about what we're doing, why, and the challenges we're overcoming."

## Data Sources

### 1. Notion - Previous Updates & Structure

Fetch the team updates page to understand structure and baseline:

```
notion_notion-fetch(id="2a7e06b059c480fcb93fc104a024e003")
```

**What to extract:**
- Page structure (how updates are organized)
- Previous week's entries for baseline
- "Vrain" style narrative hints
- Target section ID for publishing

### 2. Linear - Issue Tracking

Query team issues with DX Deliverable label:

```
# All content calendar items
linear_list_issues(team="Education", label="DX Deliverable")

# Specific issue details
linear_get_issue(id="EDU-5")

# Recent activity (last 21 days)
linear_list_issues(team="Education", updatedAt="-P21D")
```

**Key courses to check:**
- EDU-5 through EDU-20 (see linear skill for full list)
- Check for restructuring (e.g., EDU-13 → EDU-17/18/19/20)

### 3. Slack - Channel Context

Get channel history for real-time context:

```
slack_slack_get_channel_history(channel_id="C08UMBNDZ6G", limit=100)
```

**Extract from messages:**
- Ship announcements (dates, what launched)
- Progress updates on courses
- Blockers mentioned
- Collaborator mentions (who's working on what)
- Target dates mentioned
- User/stakeholder reactions
- Links shared (docs, repos, etc.)

## Slack URL Construction

**Critical:** Slack timestamps → URLs

Timestamp: `1769114468.646389`
URL: `https://vercel.slack.com/archives/C08UMBNDZ6G/p1769114468646389`

Rule: Remove the dot, prefix with `p`

### Key Thread URLs (Jan 2026)

| Thread | Timestamp | URL |
|--------|-----------|-----|
| SME Interview Hypothesis | 1769114468.646389 | [link](https://vercel.slack.com/archives/C08UMBNDZ6G/p1769114468646389) |
| Glossary Added | 1768516732.034069 | [link](https://vercel.slack.com/archives/C08UMBNDZ6G/p1768516732034069) |
| Framework Dominance | 1768919816.091819 | [link](https://vercel.slack.com/archives/C08UMBNDZ6G/p1768919816091819) |
| Svelte/Rich Harris | 1769189831.516659 | [link](https://vercel.slack.com/archives/C08UMBNDZ6G/p1769189831516659) |
| AI Outline Generator | 1769190802.178509 | [link](https://vercel.slack.com/archives/C08UMBNDZ6G/p1769190802178509) |
| Subscription Store Ship | 1767891719788949 | [link](https://vercel.slack.com/archives/C08UMBNDZ6G/p1767891719788949) |
| Advanced Deployment | 1766178103.404909 | [link](https://vercel.slack.com/archives/C08UMBNDZ6G/p1766178103404909) |

## Output Structure

### Categories (use emoji rocks)

- **🪨 BIG ROCKS** - Major ships, strategic initiatives, validated hypotheses
- **🪨 MEDIUM ROCKS** - In-progress courses, tools with clear targets  
- **🪨 SMALL STUFF** - Backlog items, minor updates
- **🔥 Challenges** - Blockers, issues, things that slowed progress

### For Each Item Include

1. **Title with link** to live content or Linear issue
   - Format: `[Human Readable Title](https://linear.app/vercel/issue/EDU-X)` 
   - NOT just "EDU-13"

2. **Supporting links** in parentheses after title:
   - `([EDU-5](linear-url) | [Slack thread](slack-url))`

3. **Why it matters** - Business/user impact (1-2 sentences)

4. **Challenges** (for big rocks) - What made it hard

5. **Links section** for big rocks:
   - Course live URL
   - Launch tweet
   - Community announcement
   - GitHub PR (if relevant)

## Link Types to Gather

| Type | Format | Example |
|------|--------|---------|
| Linear | `https://linear.app/vercel/issue/EDU-X` | EDU-5 |
| Slack | `https://vercel.slack.com/archives/C.../p...` | Thread |
| Academy Live | `https://vercel.com/academy/[slug]` | Course |
| Academy Draft | `https://vercel.com/academy/draft/[slug]` | WIP |
| Twitter | `https://x.com/.../status/...` | Launch |
| Community | `https://community.vercel.com/t/.../...` | Announcement |
| GitHub | `https://github.com/vercel/.../pull/...` | PR |

## Swarm Decomposition Pattern

```
┌─────────────────────────────────────────────────────────┐
│  COORDINATOR                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Phase 1: Parallel Research (spawn all at once)         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ Notion  │ │ Linear  │ │ Slack   │                   │
│  │ Worker  │ │ Worker  │ │ Worker  │                   │
│  └────┬────┘ └────┬────┘ └────┬────┘                   │
│       │           │           │                         │
│       └───────────┴───────────┘                         │
│                   │                                     │
│  Phase 2: Synthesis                                     │
│  - Combine research findings                            │
│  - Categorize BIG vs SMALL                              │
│  - Add "why it matters" context                         │
│                   │                                     │
│  Phase 3: HUMAN REVIEW ← CRITICAL                       │
│  - Show draft to user before posting                    │
│  - Get feedback on tone, missing links, attribution     │
│  - Iterate until approved                               │
│                   │                                     │
│  Phase 4: Publish (after approval only)                 │
│  ┌─────────────────────────────────────┐               │
│  │ Publish Worker (writes to Notion)   │               │
│  └─────────────────────────────────────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Key Learnings

### Attribution Matters
- Track who proposed ideas vs who executed
- "Joel's hypothesis that Eve validated" NOT "Eve's hypothesis"
- Give credit accurately - this goes to leadership

### Links Are Non-Negotiable
- Every claim needs a link
- Slack threads prove timing and context
- Linear issues show the work trail
- No link = didn't happen

### Human Review Before Publish
- Manager updates go to leadership (Timothy Jordan)
- **ALWAYS** show draft before posting
- Get explicit approval
- Never auto-post to boss's Notion page

### Story > Bullets
- Boss wants narrative, not task lists
- "Why it matters" is more important than "what shipped"
- Include challenges and how they were overcome
- Make it scannable but tell a story

### Tighter is Not Always Better
- Initial instinct: make it concise
- What boss wanted: MORE detail, longer, raw material
- The update is raw material for boss to write from
- Err on the side of more context

## Example Big Rock Entry

```markdown
**[Subscription Store with Vercel and Stripe](https://vercel.com/academy/subscription-store) — SHIPPED Jan 8**
([EDU-5](https://linear.app/vercel/issue/EDU-5) | [Slack ship thread](https://vercel.slack.com/archives/C08UMBNDZ6G/p1767891719788949))

Eve built a complete end-to-end course teaching developers to build subscription e-commerce on Vercel. Full Stripe integration, webhooks, customer portal, the works.

**Why it matters:** Subscription/SaaS is the #1 business model developers ask about. This fills a huge gap - previously you had to cobble together blog posts and hope Stripe's docs were enough.

**Links:**
- [Course live](https://vercel.com/academy/subscription-store)
- [Launch tweet](https://x.com/eveporcello/status/2009307766456741896)
- [Community announcement](https://community.vercel.com/t/new-academy-course-launch-a-subscription-store-with-vercel-and-stripe/31043)
```

## Education Team Context

See: `/Users/joel/.config/opencode/skill/linear/SKILL.md`

- Team ID: `3913aea8-c6df-4fcf-ab46-caba08f1ea6c`
- Slack: #academy (`C08UMBNDZ6G`)
- Joel: `U08FCNRDY0J`
- Eve: `U09LZ68M67Q`
- Boss: Timothy Jordan

## Notion Publishing Target

- **Page:** DX Weekly Team Updates
- **Page ID:** `2a7e06b059c480fcb93fc104a024e003`
- **URL:** https://www.notion.so/vercel/DX-Weekly-Team-Updates-2a7e06b059c480fcb93fc104a024e003

## Example Usage

```
/swarm "Build weekly update for Education team [DATE]"
```

Or manually invoke with:
```
skills_use(name="weekly-update")
```
