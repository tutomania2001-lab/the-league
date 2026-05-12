# Member Milestone Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Post a celebratory `@everyone` embed in `#announcements` whenever the server hits a member count milestone (10, 20, 30, 40, 50, then every 50 forever), tracked in Supabase to prevent duplicate fires.

**Architecture:** A `getMilestone(count)` helper determines if a count is a milestone. On every human `guildMemberAdd`, after the welcome message, the bot checks the count, attempts a Supabase insert into `member_milestones` (primary-key dedup), and posts the embed if the insert succeeds.

**Tech Stack:** discord.js v14, Supabase JS client, Node.js ESM (`bot.mjs`)

---

### Task 1: Create the `member_milestones` Supabase migration

**Files:**
- Create: `supabase/migrations/004_member_milestones.sql`

- [ ] **Step 1: Write the migration file**

```sql
create table if not exists public.member_milestones (
  milestone integer primary key
);
```

Save this to `supabase/migrations/004_member_milestones.sql`.

- [ ] **Step 2: Apply the migration**

Run in the project root:

```bash
npx supabase db push
```

Expected output: migration applied successfully. If you get "already exists", the table is already there — that's fine, move on.

If you don't have the Supabase CLI linked, create the table directly in the Supabase dashboard SQL editor instead:

```sql
create table if not exists public.member_milestones (
  milestone integer primary key
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_member_milestones.sql
git commit -m "feat: add member_milestones table migration"
```

---

### Task 2: Add the `getMilestone` helper to `bot.mjs`

**Files:**
- Modify: `discord-bot/bot.mjs` — add helper near the top of the file, after the `RANKS` array (around line 93)

- [ ] **Step 1: Add the helper function**

Find the line in `discord-bot/bot.mjs` that reads:

```js
function getRankForLP(lp) {
```

Insert the following block immediately **before** that function:

```js
function getMilestone(count) {
  if (count <= 50) {
    return [10, 20, 30, 40, 50].includes(count) ? count : null;
  }
  return count % 50 === 0 ? count : null;
}
```

- [ ] **Step 2: Verify the logic manually**

Spot-check in your head (no test runner for the bot):

| Input | Expected |
|-------|----------|
| 10    | 10       |
| 15    | null     |
| 50    | 50       |
| 51    | null     |
| 100   | 100      |
| 137   | null     |
| 250   | 250      |

- [ ] **Step 3: Commit**

```bash
git add discord-bot/bot.mjs
git commit -m "feat: add getMilestone helper for member count milestones"
```

---

### Task 3: Add milestone check + announcement to `guildMemberAdd`

**Files:**
- Modify: `discord-bot/bot.mjs` — append to `guildMemberAdd` handler (currently ends around line 1703)

- [ ] **Step 1: Add the milestone block**

Find the end of the `guildMemberAdd` handler in `discord-bot/bot.mjs`. It currently ends with:

```js
  await welcomeChannel.send({ content: `👋 ${member}`, embeds: [embed] })
    .then(() => console.log('✅ Welcome message sent'))
    .catch(e => console.error('❌ Welcome send failed:', e.message));
});
```

Replace that closing `});` with the following (keep the welcome send as-is, just add before the closing brace):

```js
  await welcomeChannel.send({ content: `👋 ${member}`, embeds: [embed] })
    .then(() => console.log('✅ Welcome message sent'))
    .catch(e => console.error('❌ Welcome send failed:', e.message));

  // ── MEMBER MILESTONE ANNOUNCEMENT ────────────────────────────────
  const milestone = getMilestone(member.guild.memberCount);
  if (milestone) {
    const { error: dbError } = await supabase
      .from('member_milestones')
      .insert({ milestone });

    if (dbError) {
      if (dbError.code !== '23505') {
        console.error(`❌ Milestone DB error (${milestone}):`, dbError.message);
      }
    } else if (client.announcementsChannel) {
      const milestoneEmbed = new EmbedBuilder()
        .setTitle(`🎉 WE HIT ${milestone} MEMBERS!`)
        .setDescription(
          `${milestone} legends strong and growing! 🏆\n\n` +
          `Every single one of you has helped build **The League** into what it is today. ` +
          `Whether you're climbing the ranks, dropping knowledge in chat, or just vibing on voice — ` +
          `you're part of something real.\n\n` +
          `Here's to the next milestone. Let's keep rising. ⚡`
        )
        .setColor(0xFFD700)
        .setFooter({ text: 'The League' })
        .setTimestamp();

      await client.announcementsChannel
        .send({ content: '@everyone', embeds: [milestoneEmbed] })
        .then(() => console.log(`✅ Milestone announcement sent: ${milestone} members`))
        .catch(e => console.error(`❌ Milestone announcement failed:`, e.message));
    } else {
      console.warn(`⚠️ Milestone ${milestone} hit but announcementsChannel not cached`);
    }
  }
});
```

- [ ] **Step 2: Deploy and smoke-test**

Deploy the bot (push to Railway or your hosting provider). To verify without waiting for real joins:

1. Temporarily change `getMilestone` to always return a test value (e.g. `return 10`) and trigger a test join with a spare account
2. Confirm the embed appears in `#announcements` with `@everyone` and gold colour
3. Confirm a second test join does NOT re-post (Supabase conflict kicks in)
4. Revert the temporary `getMilestone` change

- [ ] **Step 3: Commit**

```bash
git add discord-bot/bot.mjs
git commit -m "feat: announce @everyone milestone embed when server hits member count milestones"
```
