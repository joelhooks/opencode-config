# Weekly Team Update Skill

> Build narrative weekly updates for manager reports by gathering data from multiple sources.

## Data Sources

### Notion - Previous Updates

```
notion_notion-fetch(id="<page-id>")
```

### Linear - Issue Tracking

```
linear_list_issues(team="<team>", label="DX Deliverable")
linear_get_issue(id="<issue-id>")
```

### Slack - Channel Context

```
slack_slack_get_channel_history(channel_id="<channel-id>", limit=100)
```

**Slack URL Format:** `https://<workspace>.slack.com/archives/<channel-id>/p<timestamp_without_dot>`

## Output Structure

- **BIG ROCKS** - Major ships, strategic initiatives
- **MEDIUM ROCKS** - In-progress work with clear targets
- **SMALL STUFF** - Backlog items
- **Challenges** - Blockers, issues

### For Each Item

1. Title with link (Linear issue or live content)
2. Supporting links (Slack threads, PRs, social)
3. Why it matters
4. Challenges (for big rocks)

## Swarm Pattern

1. Spawn parallel research workers (Notion, Linear, Slack)
2. **HUMAN REVIEW** before posting (critical - this goes to leadership)
3. After approval, spawn publish worker

## Key Learnings

- **Attribution matters** - "Joel's hypothesis that Eve validated"
- **Links are non-negotiable** - Every claim needs a link
- **Story > Bullets** - Boss wants narrative, not task lists
- **Human review before publish** - Manager updates go to leadership

## Linear Skill Reference

Already exists at: `/Users/joel/.config/opencode/skills/linear/SKILL.md`

- Has team IDs, collaborators, workflow states
- Use as reference for Education team queries
