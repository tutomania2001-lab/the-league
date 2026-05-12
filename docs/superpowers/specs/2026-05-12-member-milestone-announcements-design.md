# Member Milestone Announcements — Design Spec

**Date:** 2026-05-12  
**Status:** Approved

---

## Overview

When The League Discord server reaches a member count milestone, the bot posts a celebratory `@everyone` announcement embed in `#announcements`. Milestones are tracked in Supabase to prevent duplicate announcements.

---

## Milestone Thresholds

- **First band:** 10, 20, 30, 40, 50
- **Continuing:** every multiple of 50 thereafter (100, 150, 200, 250, 300, ...)

A helper function `getMilestone(count)` returns the milestone value if `count` exactly matches one, or `null` otherwise.

---

## Database

New Supabase table: `member_milestones`

| Column      | Type    | Constraints |
|-------------|---------|-------------|
| `milestone` | integer | PRIMARY KEY |

Before posting, the bot attempts to insert the milestone value. If the insert succeeds (no conflict), the announcement fires. If it fails due to a primary key conflict, the milestone was already announced — skip silently. This prevents double-fire from near-simultaneous joins.

---

## Announcement

**Channel:** `#announcements` (already cached as `client.announcementsChannel`)  
**Ping:** `@everyone` sent as message content alongside the embed

**Embed:**
- **Title:** `🎉 WE HIT [N] MEMBERS!`
- **Description:** Celebratory message thanking the community for being part of The League — acknowledges the milestone, hypes the community
- **Color:** Gold (`0xFFD700`) — distinct from the welcome embed blue (`0x00c8ff`)
- **Footer:** `The League` with timestamp

---

## Integration Point

Logic is appended to the bottom of the existing `guildMemberAdd` handler in [discord-bot/bot.mjs](../../../discord-bot/bot.mjs). Bots are already filtered out at the top of that handler (`if (member.user.bot) return`), so the milestone check only evaluates on real human joins.

**Flow:**
1. Human member joins → `guildMemberAdd` fires
2. Welcome message sent (existing behaviour, unchanged)
3. `getMilestone(member.guild.memberCount)` called
4. If `null` → done
5. If milestone → attempt insert into `member_milestones`
6. If insert succeeds → post `@everyone` + embed to `#announcements`
7. If insert conflicts → milestone already fired, skip

---

## Error Handling

- If `client.announcementsChannel` is null (channel not found at startup), log a warning and skip silently — the welcome message flow already handles this case.
- DB insert errors other than conflict are logged and do not crash the handler.

---

## Out of Scope

- No slash command to manually trigger a milestone announcement
- No configurable milestone thresholds (hardcoded as specified)
- No DM to the member who triggered the milestone
