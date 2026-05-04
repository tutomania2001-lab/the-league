import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, AttachmentBuilder } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

// Font ready promise — awaited before generating rank cards
const fontReady = (async () => {
  try {
    const [r1, r2] = await Promise.all([
      fetch('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf'),
      fetch('https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf'),
    ]);
    GlobalFonts.register(Buffer.from(await r1.arrayBuffer()), 'Roboto');
    GlobalFonts.register(Buffer.from(await r2.arrayBuffer()), 'RobotoBold');
    console.log('✅ Fonts registered');
  } catch (e) { console.error('⚠️ Font load failed:', e.message); }
})();
const WILDRIFT_NEWS_URL = 'https://wildrift.leagueoflegends.com/en-sg/news/tags/patch-notes/';
const WILDRIFT_BASE = 'https://wildrift.leagueoflegends.com';
const seenArticles = new Set();

async function fetchWildRiftArticles() {
  const res = await fetch(WILDRIFT_NEWS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  }).catch(() => null);
  if (!res?.ok) throw new Error(`HTTP ${res?.status}`);
  const html = await res.text();

  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nextMatch) throw new Error('__NEXT_DATA__ not found');

  const data = JSON.parse(nextMatch[1]);

  // Navigate known __NEXT_DATA__ structure to find articleCardGrid blade
  function findBlades(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 10) return null;
    if (Array.isArray(obj.blades)) return obj.blades;
    for (const val of Object.values(obj)) {
      const r = findBlades(val, depth + 1);
      if (r) return r;
    }
    return null;
  }

  // Log full top-level structure to diagnose
  console.log('📰 Top-level keys:', Object.keys(data));

  const blades = findBlades(data);
  console.log('📰 findBlades result:', blades ? `found ${blades.length} blades: ${blades.map(b=>b?.type).join(',')}` : 'null');

  if (blades) {
    const grid = blades.find(b => b?.type === 'articleCardGrid');
    console.log('📰 grid found:', !!grid, '| items:', grid?.items?.length ?? 'none');
    if (grid?.items?.length) {
      console.log('📰 First item keys:', Object.keys(grid.items[0]));
      console.log('📰 First item sample:', JSON.stringify(grid.items[0]).slice(0, 600));
      return grid.items.slice(0, 10);
    }
    // Try 'cards' or other field names
    for (const blade of blades) {
      for (const [key, val] of Object.entries(blade ?? {})) {
        if (Array.isArray(val) && val.length > 0 && val[0]?.title) {
          console.log(`📰 Found articles in blade.${key}:`, val.length, 'items, keys:', Object.keys(val[0]));
          return val.slice(0, 10);
        }
      }
    }
  }

  // Last resort: dump data structure to diagnose
  console.error('📰 No articles found. Full data (truncated):', JSON.stringify(data).slice(0, 1000));
  return [];
}

const TOKEN = process.env.DISCORD_TOKEN?.replace(/\s/g, '');
const GUILD_ID = process.env.GUILD_ID?.trim();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

if (!TOKEN || !GUILD_ID) { console.error('Missing env vars'); process.exit(1); }

// LP thresholds matching the app's rank system
const RANKS = [
  { key: 'iron',        name: '⚙️ Iron',        minLP: 0,    maxLP: 399  },
  { key: 'bronze',      name: '🥉 Bronze',      minLP: 400,  maxLP: 799  },
  { key: 'silver',      name: '🥈 Silver',      minLP: 800,  maxLP: 1199 },
  { key: 'gold',        name: '🥇 Gold',        minLP: 1200, maxLP: 1599 },
  { key: 'platinum',    name: '💠 Platinum',    minLP: 1600, maxLP: 1999 },
  { key: 'emerald',     name: '💚 Emerald',     minLP: 2000, maxLP: 2399 },
  { key: 'diamond',     name: '💎 Diamond',     minLP: 2400, maxLP: 2799 },
  { key: 'master',      name: '👑 Master',      minLP: 2800, maxLP: 3599 },
  { key: 'grandmaster', name: '🔴 Grandmaster', minLP: 3600, maxLP: 4799 },
  { key: 'challenger',  name: '⚡ Challenger',   minLP: 4800, maxLP: 999999 },
];

function getRankForLP(lp) {
  return RANKS.slice().reverse().find(r => lp >= r.minLP) ?? RANKS[0];
}

const LANES = [
  { key: 'baron',   name: '🏰 Baron Lane',   emoji: '🏰' },
  { key: 'jungle',  name: '🌿 Jungle',        emoji: '🌿' },
  { key: 'mid',     name: '⚔️ Mid Lane',      emoji: '⚔️' },
  { key: 'dragon',  name: '🐉 Dragon Lane',   emoji: '🐉' },
  { key: 'support', name: '🛡️ Support',       emoji: '🛡️' },
];

// ── ECONOMY ───────────────────────────────────────────────────────
const msgCooldowns      = new Map(); // userId → last XP timestamp
const voiceJoins        = new Map(); // userId → voice join timestamp
const newMemberCooldowns = new Map(); // userId → join timestamp (5 min block)

const STORE_ITEMS = [
  { id: 'red',    name: '🔴 Red',    desc: 'Red username color',    price: 200, color: 0xFF4444 },
  { id: 'blue',   name: '🔵 Blue',   desc: 'Blue username color',   price: 200, color: 0x4488FF },
  { id: 'purple', name: '🟣 Purple', desc: 'Purple username color', price: 250, color: 0x9B59B6 },
  { id: 'gold',   name: '🟡 Gold',   desc: 'Gold username color',   price: 300, color: 0xF1C40F },
  { id: 'vip',    name: '💎 VIP',    desc: 'Exclusive VIP lounge',  price: 500, color: 0x00C8FF },
];

function xpToNextLevel(n) { return 100 * (n + 1); }
function totalXpForLevel(n) { return n * (n + 1) / 2 * 100; }
function levelFromXP(xp) { let l = 0; while (totalXpForLevel(l + 1) <= xp) l++; return l; }
function xpBar(xp, level) {
  const current = xp - totalXpForLevel(level);
  const needed   = xpToNextLevel(level);
  const filled   = Math.round((current / needed) * 10);
  return `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${current}/${needed}`;
}

async function getEconomy(discordId) {
  const { data } = await supabase.from('discord_economy').select('*').eq('discord_id', discordId).maybeSingle();
  return data ?? { discord_id: discordId, xp: 0, level: 0, coins: 0 };
}
async function addActivity(discordId, username, xpGain, coinGain) {
  const cur = await getEconomy(discordId);
  const newXp    = (cur.xp    ?? 0) + xpGain;
  const newCoins = (cur.coins ?? 0) + coinGain;
  const oldLevel = cur.level ?? 0;
  const newLevel = levelFromXP(newXp);
  await supabase.from('discord_economy').upsert({ discord_id: discordId, username, xp: newXp, coins: newCoins, level: newLevel, updated_at: new Date().toISOString() });
  return { newLevel, leveledUp: newLevel > oldLevel, newXp, newCoins };
}
async function deductCoins(discordId, amount) {
  const cur = await getEconomy(discordId);
  if ((cur.coins ?? 0) < amount) return false;
  await supabase.from('discord_economy').upsert({ discord_id: discordId, coins: cur.coins - amount, updated_at: new Date().toISOString() });
  return true;
}

// ── RANK CARD GENERATOR ───────────────────────────────────────────
const RANK_COLORS = {
  iron: '#8C8C8C', bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
  platinum: '#00B4D8', emerald: '#50C878', diamond: '#B9F2FF',
  master: '#9B59B6', grandmaster: '#E74C3C', challenger: '#F1C40F',
};

async function generateRankCard(member, eco, rank, position) {
  await fontReady; // ensure fonts are loaded before drawing

  const W = 934, H = 282;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');
  const rc     = RANK_COLORS[rank.key] ?? '#00c8ff';

  const f  = (size, bold = false) => `${bold ? 'bold ' : ''}${size}px ${bold ? 'RobotoBold' : 'Roboto'}, sans-serif`;
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  // ── Background ──────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0f0f1a'); bgGrad.addColorStop(1, '#1c1c2e');
  ctx.fillStyle = bgGrad; rr(0, 0, W, H, 20); ctx.fill();

  // Subtle rank-colour glow top-left
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 300);
  glow.addColorStop(0, rc + '33'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // Left accent bar
  ctx.fillStyle = rc; rr(0, 0, 6, H, [20, 0, 0, 20]); ctx.fill();

  // ── Avatar ──────────────────────────────────────────────────────
  const cx = 100, cy = 141, cr = 68;
  try {
    const url = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    const img = await loadImage(url);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, cx - cr, cy - cr, cr * 2, cr * 2);
    ctx.restore();
  } catch {
    // Draw placeholder circle if avatar fails
    ctx.fillStyle = '#2a2a4a';
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#aaa'; ctx.font = f(40, true);
    ctx.textAlign = 'center'; ctx.fillText(member.displayName[0].toUpperCase(), cx, cy + 14); ctx.textAlign = 'left';
  }
  // Avatar ring
  ctx.strokeStyle = rc; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, cr + 3, 0, Math.PI * 2); ctx.stroke();

  // ── Text ────────────────────────────────────────────────────────
  const tx = 195;
  ctx.fillStyle = '#ffffff'; ctx.font = f(34, true);
  ctx.fillText(member.displayName, tx, 72);

  ctx.fillStyle = rc; ctx.font = f(20, true);
  ctx.fillText(`${rank.name}  ·  ${eco.lp ?? 0} LP`, tx, 105);

  // ── XP Bar ──────────────────────────────────────────────────────
  const level  = eco.level ?? 0;
  const curXP  = Math.max(0, (eco.xp ?? 0) - totalXpForLevel(level));
  const needXP = xpToNextLevel(level);
  const fill   = needXP > 0 ? Math.min(1, curXP / needXP) : 0;
  const bx = tx, by = 125, bw = W - tx - 30, bh = 20;

  ctx.fillStyle = '#252538'; rr(bx, by, bw, bh, 10); ctx.fill();
  if (fill > 0) {
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, rc); grad.addColorStop(1, '#00c8ff');
    ctx.fillStyle = grad; rr(bx, by, Math.max(bw * fill, 20), bh, 10); ctx.fill();
  }

  // XP label
  ctx.fillStyle = '#8888aa'; ctx.font = f(14);
  ctx.fillText(`${curXP.toLocaleString()} / ${needXP.toLocaleString()} XP`, bx, by + bh + 18);
  ctx.fillStyle = rc; ctx.font = f(14, true);
  ctx.textAlign = 'right';
  ctx.fillText(`LVL ${level}`, bx + bw, by + bh + 18);
  ctx.textAlign = 'left';

  // ── Stats row ───────────────────────────────────────────────────
  const stats = [
    { label: 'COINS',    value: (eco.coins ?? 0).toLocaleString() },
    { label: 'RANK',     value: `#${position} on server` },
    { label: 'MESSAGES', value: `Earns 10–20 XP / min` },
  ];
  let sx = tx;
  for (const s of stats) {
    ctx.fillStyle = '#555577'; ctx.font = f(12, true);
    ctx.fillText(s.label, sx, 190);
    ctx.fillStyle = '#ffffff'; ctx.font = f(18, true);
    ctx.fillText(s.value, sx, 212);
    sx += 250;
  }

  // ── Bottom border ────────────────────────────────────────────────
  const lineGrad = ctx.createLinearGradient(0, H - 4, W, H - 4);
  lineGrad.addColorStop(0, rc); lineGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lineGrad; ctx.fillRect(0, H - 4, W, 4);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'rank-card.png' });
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildVoiceStates],
});

// In-memory store for private rooms: channelId → { ownerId, password, lobbyMessageId }
const privateRooms = new Map();

// ── MINI GAMES ────────────────────────────────────────────────────
const games = new Map();
let gCount = 0;
const newGid = () => String(++gCount);

// TTT
const TTT_WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function tttWinner(b) {
  for (const [a,b2,c] of TTT_WINS) if (b[a] && b[a]===b[b2] && b[a]===b[c]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}
function buildTttRows(board, gid, done) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i = r*3+c, v = board[i];
      row.addComponents(new ButtonBuilder()
        .setCustomId(`ttt_${gid}_${i}`)
        .setLabel(v || String(i+1))
        .setStyle(v==='X'?ButtonStyle.Danger:v==='O'?ButtonStyle.Primary:ButtonStyle.Secondary)
        .setDisabled(done || !!v));
    }
    rows.push(row);
  }
  return rows;
}

// Connect 4
const C4R=6, C4C=7;
function newC4() { return Array.from({length:C4R},()=>Array(C4C).fill(0)); }
function dropC4(b,col,p) { for(let r=C4R-1;r>=0;r--) if(!b[r][col]){b[r][col]=p;return true;} return false; }
function checkC4(b,p) {
  const ok=(r,c,dr,dc)=>[0,1,2,3].every(i=>b[r+i*dr]?.[c+i*dc]===p);
  for(let r=0;r<C4R;r++) for(let c=0;c<C4C;c++)
    if(ok(r,c,0,1)||ok(r,c,1,0)||ok(r,c,1,1)||ok(r,c,1,-1)) return true;
  return false;
}
function renderC4(b) {
  return b.map(r=>r.map(c=>c===1?'🔴':c===2?'🟡':'⚫').join('')).join('\n')+'\n1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
}
function c4Buttons(gid,b,done) {
  return new ActionRowBuilder().addComponents(
    Array.from({length:C4C},(_,c)=>new ButtonBuilder()
      .setCustomId(`c4_${gid}_${c}`).setLabel(String(c+1))
      .setStyle(ButtonStyle.Primary).setDisabled(done||b[0][c]!==0))
  );
}

// ── BOT AI ────────────────────────────────────────────────────────
const BOT_ID = 'BOT';
function botRPS() { return ['r','p','s'][Math.floor(Math.random()*3)]; }
function botTTT(board) {
  const try_ = (sym) => { for(let i=0;i<9;i++) { if(!board[i]) { board[i]=sym; if(tttWinner(board)){board[i]='';return i;} board[i]=''; } } return -1; };
  let m = try_('O'); if(m>=0) return m;
  m = try_('X'); if(m>=0) return m;
  if(!board[4]) return 4;
  const corners=[0,2,6,8].filter(i=>!board[i]);
  if(corners.length) return corners[Math.floor(Math.random()*corners.length)];
  const avail=[...Array(9).keys()].filter(i=>!board[i]);
  return avail[Math.floor(Math.random()*avail.length)] ?? -1;
}
function botC4(board) {
  for(let c=0;c<C4C;c++) { if(board[0][c]) continue; const t=board.map(r=>[...r]); dropC4(t,c,2); if(checkC4(t,2)) return c; }
  for(let c=0;c<C4C;c++) { if(board[0][c]) continue; const t=board.map(r=>[...r]); dropC4(t,c,1); if(checkC4(t,1)) return c; }
  const pref=[3,2,4,1,5,0,6].filter(c=>!board[0][c]);
  return pref[0]??0;
}

client.once('clientReady', async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  try {
  const guild = await client.guilds.fetch(GUILD_ID);
  const guildRoles = await guild.roles.fetch();
  const guildChannels = await guild.channels.fetch();

  // Cache announcements channel for presence notifications
  client.announcementsChannel = guildChannels.find(c => c?.name === 'announcements') ?? null;
  console.log(client.announcementsChannel ? '✅ Announcements channel cached' : '❌ Announcements channel not found');

  // Map all roles
  const roles = {};
  for (const [id, role] of guildRoles) {
    if (role.name.includes('New Arrival'))     roles.newArrival = id;
    if (role.name.includes('Member') && !role.name.includes('New')) roles.member = id;
    if (role.name.includes('Verified Player')) roles.verified = id;
    if (role.name.includes('Admin'))           roles.admin = id;
    if (role.name === '@everyone')             roles.everyone = id;
    // Map rank roles
    for (const rank of RANKS) {
      if (role.name.toLowerCase().includes(rank.key)) roles[rank.key] = id;
    }
    // Map lane roles
    for (const lane of LANES) {
      if (role.name.toLowerCase().includes(lane.key)) roles[`lane_${lane.key}`] = id;
    }
  }

  // Create any missing lane roles
  for (const lane of LANES) {
    if (!roles[`lane_${lane.key}`]) {
      const newRole = await guild.roles.create({ name: lane.name, reason: 'Lane role' }).catch(() => null);
      if (newRole) roles[`lane_${lane.key}`] = newRole.id;
    }
  }

  client.roles = roles;
  console.log('Roles mapped:', Object.keys(roles));

  // New Arrivals see ONLY #rules — everything else unlocks after registering
  console.log('🔒 Role IDs — everyone:', roles.everyone, 'newArrival:', roles.newArrival, 'member:', roles.member);
  for (const [, channel] of guildChannels) {
    if (!channel.permissionsFor || channel.type === 4) continue;
    try {
      if (channel.name === 'rules') {
        await channel.permissionOverwrites.edit(roles.everyone,   { ViewChannel: true,  SendMessages: false });
        if (roles.newArrival) await channel.permissionOverwrites.edit(roles.newArrival, { ViewChannel: true, SendMessages: false });
        if (roles.member)     await channel.permissionOverwrites.edit(roles.member,     { ViewChannel: true, SendMessages: false });
      } else {
        // Deny New Arrival role instead of @everyone — avoids Onboarding conflict
        if (roles.newArrival) await channel.permissionOverwrites.edit(roles.newArrival, { ViewChannel: false });
        if (roles.member)     await channel.permissionOverwrites.edit(roles.member,     { ViewChannel: true });
        // Also deny @everyone where possible (may fail on some channels due to Onboarding)
        await channel.permissionOverwrites.edit(roles.everyone, { ViewChannel: false }).catch(() => {});
      }
    } catch (e) {
      console.error(`❌ Failed to lock #${channel.name}:`, e.message);
    }
  }

  // Auto-assign New Arrival to members without Member role
  const members = await guild.members.fetch();
  for (const [, member] of members) {
    if (member.user.bot) continue;
    if (!member.roles.cache.has(roles.member) && !member.roles.cache.has(roles.newArrival)) {
      await member.roles.add(roles.newArrival).catch(() => {});
    }
  }

  // Post Register button in #rules
  const rulesChannel = guildChannels.find(c => c.name === 'rules');
  if (rulesChannel) {
    const existing = await rulesChannel.messages.fetch({ limit: 20 });
    for (const [, m] of existing.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('register').setLabel('✅ I have read the rules — Register').setStyle(ButtonStyle.Success),
    );
    const embed = new EmbedBuilder()
      .setTitle('◈ THE LEAGUE — SERVER RULES')
      .setDescription(
        '**1️⃣** Respect all members — zero tolerance for toxicity\n' +
        '**2️⃣** No spam, self-promotion or ads without permission\n' +
        '**3️⃣** Keep discussions in the correct channels\n' +
        '**4️⃣** No cheating, exploiting or match manipulation\n' +
        '**5️⃣** Tournament disputes go in #dispute-a-result only\n' +
        '**6️⃣** Staff decisions are final\n' +
        '**7️⃣** English only in main channels\n' +
        '**8️⃣** No sharing of personal information\n\n' +
        '> Breaking these rules = ⚠️ warning → 🔇 mute → 🔨 ban\n\n' +
        '**Click below to register and access the server.**'
      )
      .setColor(0x00c8ff)
      .setFooter({ text: 'The League — Wild Rift Tournament Platform' });
    await rulesChannel.send({ embeds: [embed], components: [row] });
    console.log('✅ Register button posted');
  }

  // Register slash commands
  await guild.commands.set([
    { name: 'rankcard',    description: 'Display your rank card' },
    { name: 'stats',       description: 'Show your app & server stats' },
    { name: 'leaderboard', description: 'Show the top 10 XP leaderboard' },
    { name: 'compare',     description: 'Compare your rank with another player',
      options: [{ name: 'user', type: 6, description: 'Player to compare with', required: true }] },
    { name: 'patch', description: 'Show the latest Wild Rift patch notes' },
    { name: 'flip',  description: 'Flip a coin — heads or tails' },
    { name: 'roll',  description: 'Roll a dice',
      options: [{ name: 'sides', type: 4, description: 'Number of sides (default 6)', required: false }] },
    { name: 'duel',  description: 'Challenge someone to Rock Paper Scissors',
      options: [{ name: 'user', type: 6, description: 'Player to challenge (leave empty to play vs Bot)', required: false }] },
  ]).catch(e => console.error('⚠️ Slash command registration failed:', e.message));
  console.log('✅ Slash commands registered');

  // Post role selector in #get-roles
  const getRolesChannel = guildChannels.find(c => c.name === 'get-roles');
  if (getRolesChannel) {
    const existing = await getRolesChannel.messages.fetch({ limit: 20 });
    for (const [, m] of existing.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});

    // Verified Player button
    const verifiedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('toggle_verified').setLabel('✅ Link Your App Account').setStyle(ButtonStyle.Primary),
    );

    // Lane select menu
    const laneMenu = new StringSelectMenuBuilder()
      .setCustomId('lane_select')
      .setPlaceholder('🗺️ Select your main lane')
      .addOptions(LANES.map(l => ({ label: l.name, value: l.key })));
    const laneRow = new ActionRowBuilder().addComponents(laneMenu);

    const embed = new EmbedBuilder()
      .setTitle('◈ SET UP YOUR PROFILE')
      .setDescription(
        '**✅ Link Your App Account** — Connect your The League app to Discord.\n' +
        'Your rank will be assigned and kept up to date automatically.\n\n' +
        '**🗺️ Lane Role** — Pick your main lane.\n\n' +
        '> Rank roles sync automatically every 5 minutes from the app.\n' +
        '> Admin and Moderator roles are assigned by staff only.'
      )
      .setColor(0x00c8ff)
      .setFooter({ text: 'The League — Wild Rift Tournament Platform' });

    await getRolesChannel.send({ embeds: [embed], components: [verifiedRow, laneRow] });
    console.log('✅ Role selector posted');
  }

  // ── SERVER STATS CHANNELS ────────────────────────────────────────
  async function updateStats() {
    try {
      const g = client.guilds.cache.get(GUILD_ID);
      if (!g) { console.error('Stats: guild not in cache'); return; }
      await g.members.fetch();
      const all = g.members.cache;
      const totalMembers = all.filter(m => !m.user.bot).size;
      const botCount     = all.filter(m => m.user.bot).size;
      const onlineCount  = all.filter(m => !m.user.bot && m.presence?.status && m.presence.status !== 'offline').size;
      console.log(`Stats: members=${totalMembers} online=${onlineCount} bots=${botCount}`);

      const sc = client.statChannels;
      if (!sc) { console.error('Stats: statChannels not set'); return; }
      if (sc.members) await sc.members.setName(`👥 Members: ${totalMembers}`).catch(e => console.error('members rename:', e.message));
      if (sc.online)  await sc.online.setName(`🟢 Online: ${onlineCount}`).catch(e => console.error('online rename:', e.message));
      if (sc.bots)    await sc.bots.setName(`🤖 Bots: ${botCount}`).catch(e => console.error('bots rename:', e.message));
    } catch (e) { console.error('Stats update error:', e.message); }
  }

  // Create or find the stats category + channels
  let statsCat = guildChannels.find(c => c?.name === '📊 Server Stats' && c.type === ChannelType.GuildCategory);
  if (!statsCat) {
    statsCat = await guild.channels.create({
      name: '📊 Server Stats',
      type: ChannelType.GuildCategory,
      position: 0,
      permissionOverwrites: [{ id: roles.everyone, deny: [PermissionFlagsBits.Connect] }],
    }).catch(() => null);
  }

  if (statsCat) {
    const noConnect = [{ id: roles.everyone, deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages] }];
    const existing = await guild.channels.fetch();

    const findOrCreate = async (name, fallback) => {
      return existing.find(c => c?.parentId === statsCat.id && c?.name?.startsWith(fallback)) ??
        await guild.channels.create({ name, type: ChannelType.GuildVoice, parent: statsCat.id, permissionOverwrites: noConnect }).catch(() => null);
    };

    client.statChannels = {
      members: await findOrCreate('👥 Members: ...', '👥'),
      online:  await findOrCreate('🟢 Online: ...', '🟢'),
      bots:    await findOrCreate('🤖 Bots: ...', '🤖'),
    };
    console.log('✅ Stat channels ready');
    await updateStats();
    setInterval(updateStats, 60 * 1000); // refresh every 1 minute
  }

  // ── PRIVATE TEAM ROOMS ───────────────────────────────────────────
  console.log('Setting up private rooms...');
  const allChannels = await guild.channels.fetch();
  let privateCat = allChannels.find(c => c?.name === '🔒 Private Rooms' && c.type === ChannelType.GuildCategory);
  if (!privateCat) {
    privateCat = await guild.channels.create({
      name: '🔒 Private Rooms',
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                             { id: roles.member,   allow: [PermissionFlagsBits.ViewChannel] }],
    }).catch(() => null);
  }
  if (privateCat) {
    const existing2 = await guild.channels.fetch();
    // Create-room trigger channel
    if (!existing2.find(c => c?.parentId === privateCat.id && c?.name === '🔒 Create Private Room')) {
      await guild.channels.create({
        name: '🔒 Create Private Room',
        type: ChannelType.GuildVoice,
        parent: privateCat.id,
        permissionOverwrites: [{ id: roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                               { id: roles.member,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] }],
      }).catch(() => null);
    }
    // Room lobby text channel
    let lobbyChannel = existing2.find(c => c?.parentId === privateCat.id && c?.name === '🚪-room-lobby');
    if (!lobbyChannel) {
      lobbyChannel = await guild.channels.create({
        name: '🚪-room-lobby',
        type: ChannelType.GuildText,
        parent: privateCat.id,
        permissionOverwrites: [{ id: roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                               { id: roles.member,   allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }],
      }).catch(() => null);
    }
    client.roomLobbyChannelId = lobbyChannel?.id ?? null;
    console.log('✅ Private rooms setup done');
  }

  // ── GAMES CHANNEL ────────────────────────────────────────────────
  const allCh2 = await guild.channels.fetch();
  let gamesCh = allCh2.find(c => c?.name === 'games' && c.type === ChannelType.GuildText);
  if (!gamesCh) {
    gamesCh = await guild.channels.create({
      name: 'games', type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: roles.member,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    }).catch(() => null);
  }
  if (gamesCh) {
    const existingMsgs = await gamesCh.messages.fetch({ limit: 10 });
    for (const [, m] of existingMsgs.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});
    const gameRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('game_rps').setLabel('✊ Rock Paper Scissors').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('game_ttt').setLabel('❌ Tic Tac Toe').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('game_c4').setLabel('🟡 Connect 4').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('game_hl').setLabel('🔢 Higher or Lower').setStyle(ButtonStyle.Primary),
    );
    const gameEmbed = new EmbedBuilder()
      .setTitle('◈ MINI GAMES')
      .setDescription('Challenge a member to a 1v1 game!\n\n**✊ Rock Paper Scissors** — Pick your move, may the best hand win\n**❌ Tic Tac Toe** — Classic 3x3 grid\n**🟡 Connect 4** — Drop pieces, get 4 in a row\n**🔢 Higher or Lower** — Guess the number closest to win')
      .setColor(0x00c8ff)
      .setFooter({ text: 'Click a game to challenge someone' });
    await gamesCh.send({ embeds: [gameEmbed], components: [gameRow] }).catch(() => {});
    console.log('✅ Games channel ready');
  }

  // ── WILD RIFT NEWS FEED ──────────────────────────────────────────
  const allChFeed = await guild.channels.fetch();
  let newsChannel = allChFeed.find(c => c?.name === 'wild-rift-news' && c.type === ChannelType.GuildText);
  if (!newsChannel) {
    newsChannel = await guild.channels.create({
      name: 'wild-rift-news',
      type: ChannelType.GuildText,
      topic: '📰 Official Wild Rift patch notes & news — auto-updated',
      permissionOverwrites: [
        { id: roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: roles.member,   allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
      ],
    }).catch(() => null);
  }

  async function refreshNewsChannel(channel) {
    try {
      console.log('📰 Fetching articles...');
      const articles = await fetchWildRiftArticles();
      console.log(`📰 fetchWildRiftArticles returned ${articles.length} items`);
      if (!articles.length) { console.log('📰 No articles found'); return; }

      // Clear old bot messages and repost latest 10
      const existing = await channel.messages.fetch({ limit: 20 });
      for (const [, m] of existing.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});

      for (const item of articles) {
        const title = item.title ?? item.header ?? 'Wild Rift Update';
        const url = item.link ?? item.url ?? (item.slug ? `${WILDRIFT_BASE}/en-sg/news/${item.slug}/` : WILDRIFT_NEWS_URL);
        const desc = (item.description ?? item.summary ?? item.excerpt ?? '').slice(0, 400);
        const image = item.image?.url ?? item.banner?.url ?? item.thumbnail?.url ?? item.headerImage?.url ?? null;
        const date = item.date ?? item.publishedAt ?? item.updatedAt ?? null;

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setURL(url.startsWith('http') ? url : `${WILDRIFT_BASE}${url}`)
          .setDescription(desc || 'Click to read more.')
          .setColor(0x00c8ff)
          .setFooter({ text: '📰 Wild Rift Patch Notes & News' });
        if (image) embed.setImage(image.startsWith('http') ? image : `${WILDRIFT_BASE}${image}`);
        if (date) embed.setTimestamp(new Date(date));

        await channel.send({ embeds: [embed] }).catch(() => {});
      }
      console.log(`📰 News channel refreshed with ${articles.length} articles`);
    } catch (e) {
      console.error('News refresh error:', e.message);
    }
  }

  if (newsChannel) {
    await refreshNewsChannel(newsChannel);
    setInterval(() => refreshNewsChannel(newsChannel), 30 * 60 * 1000);
    console.log('✅ Wild Rift news feed active');
  }

  // ── ECONOMY SETUP ────────────────────────────────────────────────
  const allChEco = await guild.channels.fetch();

  // Create store roles if missing
  const allRoles = await guild.roles.fetch();
  for (const item of STORE_ITEMS) {
    const existing = allRoles.find(r => r.name === item.name);
    if (!existing) {
      const r = await guild.roles.create({ name: item.name, color: item.color, reason: 'Store role' }).catch(() => null);
      if (r) roles[`store_${item.id}`] = r.id;
    } else {
      roles[`store_${item.id}`] = existing.id;
    }
  }

  // Economy category
  let ecoCat = allChEco.find(c => c?.name === '◈ Economy' && c.type === ChannelType.GuildCategory);
  if (!ecoCat) {
    ecoCat = await guild.channels.create({ name: '◈ Economy', type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                             { id: roles.member,   allow: [PermissionFlagsBits.ViewChannel] }],
    }).catch(() => null);
  }

  if (ecoCat) {
    const ecoChannels = await guild.channels.fetch();

    // #leaderboard
    let lbCh = ecoChannels.find(c => c?.name === 'leaderboard' && c?.parentId === ecoCat.id);
    if (!lbCh) lbCh = await guild.channels.create({ name: 'leaderboard', type: ChannelType.GuildText, parent: ecoCat.id,
      permissionOverwrites: [{ id: roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                             { id: roles.member,   allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }],
    }).catch(() => null);

    // #store
    let storeCh = ecoChannels.find(c => c?.name === 'store' && c?.parentId === ecoCat.id);
    if (!storeCh) storeCh = await guild.channels.create({ name: 'store', type: ChannelType.GuildText, parent: ecoCat.id,
      permissionOverwrites: [{ id: roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                             { id: roles.member,   allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }],
    }).catch(() => null);

    // eco_profile merged into rank_card button — no separate button needed

    client.lbChannelId    = lbCh?.id ?? null;
    client.storeChannelId = storeCh?.id ?? null;
    client.ecoRoles       = roles;

    // Post/refresh store
    async function refreshStore() {
      if (!storeCh) return;
      const existing = await storeCh.messages.fetch({ limit: 20 });
      for (const [, m] of existing.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});
      const embed = new EmbedBuilder().setTitle('◈ THE LEAGUE STORE').setDescription(
        STORE_ITEMS.map(i => `${i.name} **${i.desc}** — 🪙 **${i.price} coins**`).join('\n')
      ).setColor(0x00c8ff).setFooter({ text: 'Earn coins by chatting and spending time in voice channels' });
      const rows = [];
      for (let i = 0; i < STORE_ITEMS.length; i += 3) {
        const row = new ActionRowBuilder();
        for (const item of STORE_ITEMS.slice(i, i + 3)) {
          row.addComponents(new ButtonBuilder().setCustomId(`buy_${item.id}`).setLabel(`${item.name} — ${item.price}🪙`).setStyle(ButtonStyle.Primary));
        }
        rows.push(row);
      }
      await storeCh.send({ embeds: [embed], components: rows }).catch(() => {});
    }

    // Post/refresh leaderboard
    async function refreshLeaderboard() {
      if (!lbCh) return;
      const { data } = await supabase.from('discord_economy').select('username,xp,level,coins').order('xp', { ascending: false }).limit(10);
      if (!data?.length) return;
      const existing = await lbCh.messages.fetch({ limit: 10 });
      for (const [, m] of existing.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});
      const medals = ['🥇','🥈','🥉'];
      const embed = new EmbedBuilder().setTitle('◈ XP LEADERBOARD').setDescription(
        data.map((u, i) => `${medals[i] ?? `**${i+1}.**`} **${u.username ?? 'Unknown'}** — Lv.${u.level} • ${u.xp} XP • 🪙 ${u.coins}`).join('\n')
      ).setColor(0x00c8ff).setTimestamp();
      await lbCh.send({ embeds: [embed] }).catch(() => {});
    }

    await refreshStore();
    await refreshLeaderboard();
    setInterval(refreshLeaderboard, 10 * 60 * 1000);
    console.log('✅ Economy system ready');
  }

  // ── FAQ CHANNEL ───────────────────────────────────────────────────
  const allChFaq = await guild.channels.fetch();
  let faqCh = allChFaq.find(c => c?.name === 'faq' && c.type === ChannelType.GuildText);
  if (!faqCh) {
    faqCh = await guild.channels.create({
      name: 'faq', type: ChannelType.GuildText,
      topic: '❓ Frequently asked questions about The League app & Discord server',
      permissionOverwrites: [
        { id: roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: roles.member,   allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
      ],
    }).catch(() => null);
  }

  if (faqCh) {
    const existing = await faqCh.messages.fetch({ limit: 20 });
    for (const [, m] of existing.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});

    const faqs = [
      {
        title: '◈ THE LEAGUE — FAQ',
        description: 'Everything you need to know about the app and this Discord server.',
        color: 0x00c8ff,
        fields: [],
      },
      {
        title: '📱 APP — Frequently Asked Questions',
        color: 0x00c8ff,
        fields: [
          { name: '❓ How do I download The League app?', value: 'Visit **https://the-leagueapp.netlify.app** to register and access the app. Available on mobile and web.' },
          { name: '❓ How do I create an account?', value: 'Go to the app, sign up with your email, and enter your **Riot ID** (e.g. `WildRifter#1234`) to link your Wild Rift account.' },
          { name: '❓ How is my LP tracked?', value: 'Your LP is pulled from your linked Riot ID inside the app. Keep your profile up to date to reflect your current rank.' },
          { name: '❓ How do I join a tournament?', value: 'Open the app, navigate to the **Tournaments** section, and register for any open event. Make sure your account is verified first.' },
          { name: '❓ How do I form a team?', value: 'Go to **Teams** in the app and create or join a team. You can invite friends via their username or Riot ID.' },
          { name: '❓ I have an issue with the app — who do I contact?', value: 'Post in **#dispute-a-result** for match issues, or DM a staff member for account problems.' },
        ],
      },
      {
        title: '🖥️ DISCORD — Frequently Asked Questions',
        color: 0x00c8ff,
        fields: [
          { name: '❓ How do I get access to the server?', value: 'Go to **#rules**, read the rules, and click **✅ I have read the rules — Register** to unlock all channels.' },
          { name: '❓ How do I get my Verified Player role?', value: 'Go to **#get-roles** and click **✅ Verified Player**. Enter your app username or Riot ID — the bot checks it against the database.' },
          { name: '❓ How do I claim my rank role?', value: 'Go to **#get-roles** and select your rank from the dropdown. Your LP in the app must match the rank you\'re claiming.' },
          { name: '❓ How do I earn XP and coins?', value: 'Send messages in the server (10–20 XP + 5–10 coins, once per minute) and spend time in voice channels (5 XP + 2 coins per minute).' },
          { name: '❓ How do I level up?', value: 'XP accumulates automatically. Each level requires more XP than the last. The bot announces your level up in **#announcements**.' },
          { name: '❓ What can I buy in the store?', value: 'Go to **#store** in the Economy section. You can buy colour roles and VIP access using your coins. Click a button to purchase instantly.' },
          { name: '❓ How do I create a private voice room?', value: 'Join the **🔒 Create Private Room** voice channel. The bot moves you to a locked room and posts a control panel in **#🚪-room-lobby** where you can set a password.' },
          { name: '❓ How do I play mini games?', value: 'Go to **#games** and click a game. You can challenge another player or play against the bot. Games include RPS, Tic Tac Toe, Connect 4, and Higher or Lower.' },
          { name: '❓ How do I pick my lane?', value: 'Go to **#get-roles** and select your main lane from the dropdown (Baron, Jungle, Mid, Dragon Lane, Support).' },
        ],
      },
    ];

    for (const faq of faqs) {
      const embed = new EmbedBuilder().setTitle(faq.title).setColor(faq.color).setFooter({ text: 'The League — Wild Rift Tournament Platform' });
      if (faq.description) embed.setDescription(faq.description);
      if (faq.fields?.length) embed.addFields(faq.fields);
      await faqCh.send({ embeds: [embed] }).catch(() => {});
    }
    console.log('✅ FAQ channel posted');
  }

  } catch (e) {
    console.error('❌ clientReady error:', e);
  }
});

// ── MESSAGE XP/COINS ─────────────────────────────────────────────
client.on('messageCreate', async msg => {
  if (msg.author.bot || !msg.guild) return;

  // 5-minute new member cooldown
  if (newMemberCooldowns.has(msg.author.id)) {
    const remaining = Math.ceil((5 * 60 * 1000 - (Date.now() - newMemberCooldowns.get(msg.author.id))) / 1000);
    await msg.delete().catch(() => {});
    const warn = await msg.channel.send(`⏳ <@${msg.author.id}> Please wait **${remaining}s** before chatting.`).catch(() => null);
    if (warn) setTimeout(() => warn.delete().catch(() => {}), 4000);
    return;
  }
  const uid = msg.author.id;
  const now = Date.now();
  if (msgCooldowns.has(uid) && now - msgCooldowns.get(uid) < 60_000) return;
  msgCooldowns.set(uid, now);
  const xp    = Math.floor(Math.random() * 11) + 10; // 10–20
  const coins = Math.floor(Math.random() * 6)  + 5;  // 5–10
  const { leveledUp, newLevel } = await addActivity(uid, msg.author.username, xp, coins).catch(() => ({}));
  if (leveledUp && client.announcementsChannel) {
    client.announcementsChannel.send(`🎉 <@${uid}> leveled up to **Level ${newLevel}**! Keep it up! 🚀`).catch(() => {});
  }
});

// ── VOICE XP/COINS ───────────────────────────────────────────────
// (voice joins tracked in voiceStateUpdate below — search for voiceJoins.set)

// New member → New Arrival + 5 min cooldown + public welcome
client.on('guildMemberAdd', async member => {
  if (member.user.bot) return;
  if (client.roles?.newArrival) await member.roles.add(client.roles.newArrival).catch(() => {});

  // Track join time for 5-min message cooldown
  newMemberCooldowns.set(member.id, Date.now());
  setTimeout(() => newMemberCooldowns.delete(member.id), 5 * 60 * 1000);
  console.log(`👋 ${member.user.tag} joined — New Arrival assigned, 5min message cooldown started`);

  const channels = await member.guild.channels.fetch();
  const textChannels = [...channels.values()].filter(c => c?.type === ChannelType.GuildText);
  console.log('Available text channels:', textChannels.map(c => c.name));

  const welcomeChannel =
    textChannels.find(c => c.name === 'welcome') ??
    textChannels.find(c => c.name === 'announcements') ??
    textChannels.find(c => c.name === 'general');

  console.log('Welcome channel found:', welcomeChannel?.name ?? 'NONE');
  if (!welcomeChannel) return;

  const rulesId   = textChannels.find(c => c.name === 'rules')?.id ?? '';
  const getRolesId = textChannels.find(c => c.name === 'get-roles')?.id ?? '';

  const embed = new EmbedBuilder()
    .setTitle('⚡ A NEW CHALLENGER APPROACHES')
    .setDescription(
      `Hey ${member}, welcome to **The League**! 🏆\n\n` +
      `You've just stepped into the home of competitive Wild Rift — where rankings are earned, not given.\n\n` +
      `**Get started:**\n` +
      `→ Read the rules & register in <#${rulesId}>\n` +
      `→ Claim your rank & lane in <#${getRolesId}>\n` +
      `→ Download the app at **the-leagueapp.netlify.app**\n\n` +
      `See you on the Rift. 🗡️`
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setColor(0x00c8ff)
    .setFooter({ text: `Member #${member.guild.memberCount} • The League` })
    .setTimestamp();

  await welcomeChannel.send({ content: `👋 ${member}`, embeds: [embed] })
    .then(() => console.log('✅ Welcome message sent'))
    .catch(e => console.error('❌ Welcome send failed:', e.message));
});

// Member comes back online → notify announcements
client.on('presenceUpdate', async (oldPresence, newPresence) => {
  if (newPresence.user?.bot) return;
  if (!client.announcementsChannel) return;
  const wasOffline = !oldPresence || oldPresence.status === 'offline';
  const isOnline = newPresence.status !== 'offline';
  if (!wasOffline || !isOnline) return;
  const name = newPresence.member?.displayName ?? newPresence.user?.username ?? 'Someone';
  console.log(`👁️ Presence: ${name} came online`);
  await client.announcementsChannel.send(`👋 **${name}** is back online!`).catch(() => {});
});

// ── PRIVATE ROOMS — VOICE STATE ──────────────────────────────────
client.on('voiceStateUpdate', async (oldState, newState) => {
  const member = newState.member ?? oldState.member;

  // Voice XP: track join time, award on leave
  if (!member?.user?.bot) {
    if (!oldState.channelId && newState.channelId) {
      voiceJoins.set(member.id, Date.now()); // joined voice
    } else if (oldState.channelId && !newState.channelId && voiceJoins.has(member.id)) {
      const mins = Math.floor((Date.now() - voiceJoins.get(member.id)) / 60_000);
      voiceJoins.delete(member.id);
      if (mins >= 1) {
        const xp = mins * 5, coins = mins * 2;
        const { leveledUp, newLevel } = await addActivity(member.id, member.user.username, xp, coins).catch(() => ({}));
        if (leveledUp && client.announcementsChannel) {
          client.announcementsChannel.send(`🎉 <@${member.id}> leveled up to **Level ${newLevel}**! 🚀`).catch(() => {});
        }
      }
    }
  }

  const guild = newState.guild;
  const allChannels = await guild.channels.fetch();
  const createChannel = allChannels.find(c => c?.name === '🔒 Create Private Room');

  // User joined the create-room trigger
  if (newState.channelId === createChannel?.id) {
    const member = newState.member;
    const room = await guild.channels.create({
      name: `🔒 ${member.displayName}'s Room`,
      type: ChannelType.GuildVoice,
      parent: createChannel.parentId,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel] },
        { id: member.id,            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.MuteMembers] },
        { id: client.user.id,       allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] },
      ],
    }).catch(() => null);
    if (!room) return;

    await member.voice.setChannel(room).catch(() => {});

    // Post control panel in room lobby
    const lobbyChannel = client.roomLobbyChannelId ? guild.channels.cache.get(client.roomLobbyChannelId) : null;
    if (!lobbyChannel) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`room_setpw_${room.id}`).setLabel('🔑 Set Password').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`room_join_${room.id}`).setLabel('🚪 Join Room').setStyle(ButtonStyle.Secondary),
    );
    const embed = new EmbedBuilder()
      .setTitle(`🔒 ${member.displayName}'s Private Room`)
      .setDescription(`**Owner:** ${member}\n**Password:** Not set yet\n\nOwner: click **Set Password** to lock your room.\nOthers: click **Join Room** and enter the password.`)
      .setColor(0x00c8ff)
      .setTimestamp();
    const msg = await lobbyChannel.send({ embeds: [embed], components: [row] }).catch(() => null);
    if (msg) privateRooms.set(room.id, { ownerId: member.id, password: null, lobbyMessageId: msg.id });
  }

  // Cleanup when private room empties
  if (oldState.channelId && privateRooms.has(oldState.channelId)) {
    const room = guild.channels.cache.get(oldState.channelId);
    if (room && room.members.size === 0) {
      const data = privateRooms.get(oldState.channelId);
      privateRooms.delete(oldState.channelId);
      // Delete lobby message
      if (client.roomLobbyChannelId && data?.lobbyMessageId) {
        const lobby = guild.channels.cache.get(client.roomLobbyChannelId);
        await lobby?.messages.fetch(data.lobbyMessageId).then(m => m.delete()).catch(() => {});
      }
      await room.delete().catch(() => {});
    }
  }
});

// Log ALL interactions for debugging
client.on('interactionCreate', interaction => {
  console.log(`🔔 Interaction: type=${interaction.type} id=${interaction.customId ?? interaction.commandName ?? 'n/a'}`);
});

// ── GAME OPPONENT SELECTION ──────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isUserSelectMenu()) return;
  if (!interaction.customId.startsWith('game_sel_')) return;
  const type = interaction.customId.replace('game_sel_', '');
  const opponent = interaction.values[0];
  if (opponent === interaction.user.id) return interaction.update({ content: '❌ You can\'t challenge yourself!', components: [] });
  const opp = await interaction.guild.members.fetch(opponent).catch(() => null);
  if (!opp || opp.user.bot) return interaction.update({ content: '❌ Invalid opponent.', components: [] });

  const gid = newGid();
  const names = { rps:'✊ Rock Paper Scissors', ttt:'❌ Tic Tac Toe', c4:'🟡 Connect 4', hl:'🔢 Higher or Lower' };
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`game_acc_${gid}_${type}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`game_dec_${gid}`).setLabel('❌ Decline').setStyle(ButtonStyle.Danger),
  );
  await interaction.update({ content: `📨 Challenge sent to ${opp}!`, components: [] });
  await interaction.followUp({
    content: `🎮 ${opp}, **${interaction.user.displayName}** challenges you to **${names[type]}**!`,
    components: [row],
    ephemeral: false,
  });
  games.set(gid, { type, p1: interaction.user.id, p2: opponent, status: 'pending' });
});

// ── SLASH COMMANDS ───────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'rankcard') {
    await interaction.deferReply();
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const eco = await getEconomy(interaction.user.id);
      const { data: appUser } = await supabase.from('users').select('lp').eq('discord_id', interaction.user.id).maybeSingle();
      eco.lp = appUser?.lp ?? null;
      const rank = getRankForLP(appUser?.lp ?? 0);
      const { data: lb } = await supabase.from('discord_economy').select('discord_id').order('xp', { ascending: false });
      const position = (lb ?? []).findIndex(u => u.discord_id === interaction.user.id) + 1 || '?';
      const card = await generateRankCard(member, eco, rank, position);
      await interaction.editReply({ files: [card] });
    } catch (e) {
      console.error('rankcard error:', e.message);
      interaction.editReply({ content: '❌ Failed to generate rank card.' }).catch(() => {});
    }
  }

  // ── /stats ───────────────────────────────────────────────────────
  if (interaction.commandName === 'stats') {
    await interaction.deferReply();
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const eco = await getEconomy(interaction.user.id);
      const { data: appUser } = await supabase.from('users').select('riot_id, username, lp').eq('discord_id', interaction.user.id).maybeSingle();
      const rank = getRankForLP(appUser?.lp ?? 0);
      const { data: lb } = await supabase.from('discord_economy').select('discord_id').order('xp', { ascending: false });
      const position = (lb ?? []).findIndex(u => u.discord_id === interaction.user.id) + 1 || '?';
      const level = eco.level ?? 0;
      const curXP = Math.max(0, (eco.xp ?? 0) - totalXpForLevel(level));
      const needXP = xpToNextLevel(level);

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${member.displayName}'s Stats`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
        .setColor(RANK_COLORS[rank.key] ?? 0x00c8ff)
        .addFields(
          { name: '🏆 Rank',        value: appUser ? `${rank.name} — ${appUser.lp ?? 0} LP` : 'Not linked', inline: true },
          { name: '🎮 App Account',  value: appUser?.riot_id ?? appUser?.username ?? 'Not linked', inline: true },
          { name: '🏅 Server Level', value: `Level ${level}`, inline: true },
          { name: '⭐ XP',           value: `${(eco.xp ?? 0).toLocaleString()} total`, inline: true },
          { name: '📊 Progress',     value: `${curXP.toLocaleString()} / ${needXP.toLocaleString()} XP to next level`, inline: true },
          { name: '🪙 Coins',        value: (eco.coins ?? 0).toLocaleString(), inline: true },
          { name: '🎖️ Server Rank', value: `#${position} on leaderboard`, inline: true },
        )
        .setFooter({ text: 'The League — Wild Rift Tournament Platform' })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error('stats error:', e.message);
      interaction.editReply({ content: '❌ Failed to fetch stats.' }).catch(() => {});
    }
  }

  // ── /leaderboard ─────────────────────────────────────────────────
  if (interaction.commandName === 'leaderboard') {
    await interaction.deferReply();
    try {
      const { data } = await supabase.from('discord_economy').select('username, xp, level, coins').order('xp', { ascending: false }).limit(10);
      const medals = ['🥇','🥈','🥉'];
      const embed = new EmbedBuilder()
        .setTitle('◈ XP LEADERBOARD')
        .setDescription(
          data?.length
            ? data.map((u, i) => `${medals[i] ?? `**${i+1}.**`} **${u.username ?? 'Unknown'}** — Lv.${u.level} • ${(u.xp ?? 0).toLocaleString()} XP • 🪙 ${u.coins ?? 0}`).join('\n')
            : 'No data yet.'
        )
        .setColor(0x00c8ff)
        .setTimestamp()
        .setFooter({ text: 'Earn XP by chatting and spending time in voice' });
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error('leaderboard error:', e.message);
      interaction.editReply({ content: '❌ Failed to fetch leaderboard.' }).catch(() => {});
    }
  }

  // ── /compare ─────────────────────────────────────────────────────
  if (interaction.commandName === 'compare') {
    await interaction.deferReply();
    try {
      const targetUser = interaction.options.getUser('user');
      if (targetUser.id === interaction.user.id) {
        return interaction.editReply({ content: '❌ You can\'t compare yourself with yourself!' });
      }
      const [m1, m2] = await Promise.all([
        interaction.guild.members.fetch(interaction.user.id),
        interaction.guild.members.fetch(targetUser.id).catch(() => null),
      ]);
      if (!m2) return interaction.editReply({ content: '❌ That user is not in this server.' });

      const [eco1, eco2] = await Promise.all([getEconomy(interaction.user.id), getEconomy(targetUser.id)]);
      const [app1, app2] = await Promise.all([
        supabase.from('users').select('riot_id, lp').eq('discord_id', interaction.user.id).maybeSingle(),
        supabase.from('users').select('riot_id, lp').eq('discord_id', targetUser.id).maybeSingle(),
      ]);
      const rank1 = getRankForLP(app1.data?.lp ?? 0);
      const rank2 = getRankForLP(app2.data?.lp ?? 0);

      const row = (label, v1, v2) => `**${label}**\n${v1}  vs  ${v2}`;
      const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${m1.displayName}  vs  ${m2.displayName}`)
        .setColor(0x00c8ff)
        .setDescription([
          row('🏆 Rank',    `${rank1.name} (${app1.data?.lp ?? 0} LP)`,  `${rank2.name} (${app2.data?.lp ?? 0} LP)`),
          row('🏅 Level',   `Level ${eco1.level ?? 0}`,                   `Level ${eco2.level ?? 0}`),
          row('⭐ XP',      `${(eco1.xp ?? 0).toLocaleString()}`,         `${(eco2.xp ?? 0).toLocaleString()}`),
          row('🪙 Coins',   `${(eco1.coins ?? 0).toLocaleString()}`,      `${(eco2.coins ?? 0).toLocaleString()}`),
        ].join('\n\n'))
        .setFooter({ text: 'The League — Wild Rift Tournament Platform' })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error('compare error:', e.message);
      interaction.editReply({ content: '❌ Failed to compare players.' }).catch(() => {});
    }
  }

  // ── /duel ────────────────────────────────────────────────────────
  if (interaction.commandName === 'duel') {
    const target = interaction.options.getUser('user');
    const gid = newGid();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rps_${gid}_r`).setLabel('✊ Rock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rps_${gid}_p`).setLabel('✋ Paper').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rps_${gid}_s`).setLabel('✌️ Scissors').setStyle(ButtonStyle.Secondary),
    );

    // vs Bot
    if (!target) {
      games.set(gid, { type: 'rps', p1: interaction.user.id, p2: BOT_ID, p1pick: null, p2pick: botRPS(), status: 'active', channelId: interaction.channelId });
      return interaction.reply({ content: `⚔️ **${interaction.user} vs 🤖 Bot — Rock Paper Scissors!**\nPick your move!`, components: [row] });
    }

    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You can\'t duel yourself!', ephemeral: true });
    if (target.bot) return interaction.reply({ content: '❌ Use `/duel` without a user to play the bot.', ephemeral: true });

    // Check target is online
    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    const presence = targetMember.presence?.status;
    if (!presence || presence === 'offline') return interaction.reply({ content: `❌ **${targetMember.displayName}** is offline. You can only duel online players.`, ephemeral: true });

    games.set(gid, { type: 'rps', p1: interaction.user.id, p2: target.id, p1pick: null, p2pick: null, status: 'active', channelId: interaction.channelId });
    await interaction.reply({ content: `⚔️ **${interaction.user} challenged ${target} to Rock Paper Scissors!**\nBoth players — pick your move!`, components: [row] });
  }

  // ── /patch ───────────────────────────────────────────────────────
  if (interaction.commandName === 'patch') {
    await interaction.deferReply();
    try {
      const articles = await fetchWildRiftArticles();
      const item = articles[0];
      if (!item) return interaction.editReply({ content: '❌ Could not fetch patch notes right now. Check <https://wildrift.leagueoflegends.com/en-sg/news/tags/patch-notes/>' });

      const title = item.title ?? item.header ?? item.heading ?? 'Latest Patch Notes';
      const rawUrl = item.link ?? item.url ?? item.articleUrl ?? (item.slug ? `${WILDRIFT_BASE}/en-sg/news/${item.slug}/` : null);
      const url = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `${WILDRIFT_BASE}${rawUrl}`) : WILDRIFT_NEWS_URL;
      const desc = (item.description ?? item.summary ?? item.excerpt ?? item.blurb ?? '').slice(0, 500);
      const imageObj = item.image ?? item.banner ?? item.thumbnail ?? item.backgroundImage ?? item.featuredImage ?? item.headerImage;
      const imageUrl = typeof imageObj === 'string' ? imageObj : imageObj?.url ?? imageObj?.src ?? null;
      const date = item.date ?? item.publishedAt ?? item.updatedAt ?? null;

      const embed = new EmbedBuilder()
        .setTitle(`📋 ${title}`)
        .setURL(url)
        .setDescription(desc || 'Click the title to read the full patch notes.')
        .setColor(0x00c8ff)
        .setFooter({ text: '🎮 Wild Rift Official Patch Notes' });
      if (imageUrl) embed.setImage(imageUrl.startsWith('http') ? imageUrl : `${WILDRIFT_BASE}${imageUrl}`);
      if (date) embed.setTimestamp(new Date(date));

      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error('patch error:', e.message);
      interaction.editReply({ content: '❌ Failed to fetch patch notes.' }).catch(() => {});
    }
  }

  // ── /flip ────────────────────────────────────────────────────────
  if (interaction.commandName === 'flip') {
    const result = Math.random() < 0.5 ? '🪙 **Heads!**' : '🪙 **Tails!**';
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rematch_flip').setLabel('🔄 Flip Again').setStyle(ButtonStyle.Secondary),
    );
    await interaction.reply({ content: `${interaction.user} flipped a coin — ${result}`, components: [row] });
  }

  // ── /roll ────────────────────────────────────────────────────────
  if (interaction.commandName === 'roll') {
    const sides = interaction.options.getInteger('sides') ?? 6;
    if (sides < 2 || sides > 1000) return interaction.reply({ content: '❌ Sides must be between 2 and 1000.', ephemeral: true });
    const result = Math.floor(Math.random() * sides) + 1;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rematch_roll_${sides}`).setLabel('🎲 Roll Again').setStyle(ButtonStyle.Secondary),
    );
    await interaction.reply({ content: `🎲 ${interaction.user} rolled a **${result}** (d${sides})`, components: [row] });
  }
});

// ── BUTTON INTERACTIONS ──────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  // Defer immediately for slow interactions (excludes anything that shows a modal)
  const slowInteractions = ['register', 'eco_profile', 'rank_card'];
  const isSlow = slowInteractions.includes(interaction.customId) || interaction.customId.startsWith('buy_');
  if (isSlow) await interaction.deferReply({ ephemeral: true }).catch(() => {});

  try {
  const freshMember = await interaction.guild.members.fetch(interaction.user.id);

  // ── RANK CARD ─────────────────────────────────────────────────────
  if (interaction.customId === 'rank_card') {
    const eco = await getEconomy(interaction.user.id);
    const { data: appUser } = await supabase.from('users').select('lp').eq('discord_id', interaction.user.id).maybeSingle();
    eco.lp = appUser?.lp ?? null;
    const rank = getRankForLP(appUser?.lp ?? 0);
    const { data: lb } = await supabase.from('discord_economy').select('discord_id').order('xp', { ascending: false });
    const position = (lb ?? []).findIndex(u => u.discord_id === interaction.user.id) + 1 || '?';
    const card = await generateRankCard(freshMember, eco, rank, position);
    return interaction.editReply({ files: [card] });
  }

  // eco_profile merged into rank_card

  // ── STORE PURCHASE ───────────────────────────────────────────────
  if (interaction.customId.startsWith('buy_')) {
    const itemId = interaction.customId.replace('buy_', '');
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) return interaction.editReply({ content: '❌ Item not found.' });
    const roleId = client.ecoRoles?.[`store_${itemId}`];
    if (roleId && freshMember.roles.cache.has(roleId)) {
      return interaction.editReply({ content: `✅ You already own **${item.name}**!` });
    }
    const ok = await deductCoins(interaction.user.id, item.price);
    if (!ok) return interaction.editReply({ content: `❌ Not enough coins! You need **${item.price}🪙** to buy **${item.name}**.` });
    if (roleId) await freshMember.roles.add(roleId).catch(() => {});
    return interaction.editReply({ content: `✅ Purchased **${item.name}**! 🎉 ${roleId ? 'Role applied.' : ''}` });
  }

  // ── REMATCH BUTTONS ──────────────────────────────────────────────
  if (interaction.customId === 'rematch_flip') {
    const result = Math.random() < 0.5 ? '🪙 **Heads!**' : '🪙 **Tails!**';
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('rematch_flip').setLabel('🔄 Flip Again').setStyle(ButtonStyle.Secondary));
    return interaction.update({ content: `${interaction.user} flipped a coin — ${result}`, components: [row] });
  }

  if (interaction.customId.startsWith('rematch_roll_')) {
    const sides = parseInt(interaction.customId.replace('rematch_roll_', '')) || 6;
    const result = Math.floor(Math.random() * sides) + 1;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`rematch_roll_${sides}`).setLabel('🎲 Roll Again').setStyle(ButtonStyle.Secondary));
    return interaction.update({ content: `🎲 ${interaction.user} rolled a **${result}** (d${sides})`, components: [row] });
  }

  if (interaction.customId.startsWith('rematch_duel_')) {
    const parts = interaction.customId.split('_');
    const p1id = parts[2], p2id = parts[3];
    if (interaction.user.id !== p1id && interaction.user.id !== p2id) {
      return interaction.reply({ content: '❌ Only the original players can rematch.', ephemeral: true });
    }
    const gid = newGid();
    const rpsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rps_${gid}_r`).setLabel('✊ Rock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rps_${gid}_p`).setLabel('✋ Paper').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rps_${gid}_s`).setLabel('✌️ Scissors').setStyle(ButtonStyle.Secondary),
    );
    if (p2id === BOT_ID) {
      games.set(gid, { type: 'rps', p1: p1id, p2: BOT_ID, p1pick: null, p2pick: botRPS(), status: 'active', channelId: interaction.channelId });
      return interaction.update({ content: `⚔️ **Rematch! <@${p1id}> vs 🤖 Bot**\nPick your move!`, components: [rpsRow] });
    }
    games.set(gid, { type: 'rps', p1: p1id, p2: p2id, p1pick: null, p2pick: null, status: 'active', channelId: interaction.channelId });
    return interaction.update({ content: `⚔️ **Rematch! <@${p1id}> vs <@${p2id}>**\nBoth players — pick your move!`, components: [rpsRow] });
  }

  // ── GAME LOBBY BUTTONS ──────────────────────────────────────────
  const gameTypes = ['rps','ttt','c4','hl'];
  if (gameTypes.some(t => interaction.customId === `game_${t}`)) {
    const type = interaction.customId.replace('game_', '');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`game_vsp_${type}`).setLabel('👤 Challenge a Player').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`game_vsb_${type}`).setLabel('🤖 Play vs Bot').setStyle(ButtonStyle.Secondary),
    );
    return interaction.reply({ content: '🎮 Who do you want to play against?', components: [row], ephemeral: true });
  }

  // vs Player — show opponent selector
  if (interaction.customId.startsWith('game_vsp_')) {
    console.log('game_vsp_ hit:', interaction.customId);
    const type = interaction.customId.replace('game_vsp_', '');
    const sel = new UserSelectMenuBuilder().setCustomId(`game_sel_${type}`).setPlaceholder('Select your opponent').setMaxValues(1);
    return interaction.reply({ content: '👇 Who do you want to challenge?', components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
  }

  // vs Bot — start immediately
  if (interaction.customId.startsWith('game_vsb_')) {
    console.log('game_vsb_ hit:', interaction.customId);
    const type = interaction.customId.replace('game_vsb_', '');
    const gid = newGid();
    const g = { type, p1: interaction.user.id, p2: BOT_ID, status: 'active', channelId: interaction.channelId };
    games.set(gid, g);
    await interaction.reply({ content: '🤖 Starting game vs Bot...', components: [], ephemeral: true });

    if (type === 'rps') {
      g.p1pick = null; g.p2pick = botRPS();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rps_${gid}_r`).setLabel('✊ Rock').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rps_${gid}_p`).setLabel('✋ Paper').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rps_${gid}_s`).setLabel('✌️ Scissors').setStyle(ButtonStyle.Secondary),
      );
      return interaction.followUp({ ephemeral: false, content: `✊ **Rock Paper Scissors vs 🤖 Bot**\n${freshMember} — Pick your move!`, components: [row] });
    }
    if (type === 'ttt') {
      g.board = Array(9).fill(''); g.turn = g.p1;
      const rows = buildTttRows(g.board, gid, false);
      rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('_').setLabel(`❌ ${freshMember.displayName}'s turn`).setStyle(ButtonStyle.Secondary).setDisabled(true)));
      return interaction.followUp({ ephemeral: false, content: `❌⭕ **Tic Tac Toe vs 🤖 Bot** — ${freshMember} you go first (❌)`, components: rows });
    }
    if (type === 'c4') {
      g.board = newC4(); g.turn = g.p1;
      const embed = new EmbedBuilder().setTitle('🟡 Connect 4 vs 🤖 Bot').setDescription(renderC4(g.board)).setColor(0x00c8ff).setFooter({text:`🔴 ${freshMember.displayName} vs 🟡 Bot — 🔴 you go first`});
      return interaction.followUp({ ephemeral: false, embeds: [embed], components: [c4Buttons(gid, g.board, false)] });
    }
    if (type === 'hl') {
      g.number = Math.floor(Math.random()*100)+1; g.p1guess = null;
      g.p2guess = Math.floor(Math.random()*100)+1; // bot guesses immediately
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`hl_${gid}`).setLabel('🔢 Make Your Guess (1–100)').setStyle(ButtonStyle.Primary));
      return interaction.followUp({ ephemeral: false, content: `🔢 **Higher or Lower vs 🤖 Bot**\n${freshMember} — I've picked a number 1–100. The bot already guessed. Can you get closer?`, components: [row] });
    }
  }

  // ACCEPT CHALLENGE
  if (interaction.customId.startsWith('game_acc_')) {
    const [,,gid,...rest] = interaction.customId.split('_');
    const type = rest.join('_');
    const g = games.get(gid);
    if (!g) return interaction.update({ content: '❌ Challenge expired.', components: [] });
    if (interaction.user.id !== g.p2) return interaction.reply({ content: '❌ This challenge isn\'t for you.', ephemeral: true });
    g.status = 'active';
    g.channelId = interaction.channelId;

    if (type === 'rps') {
      g.p1pick = null; g.p2pick = null;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rps_${gid}_r`).setLabel('✊ Rock').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rps_${gid}_p`).setLabel('✋ Paper').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rps_${gid}_s`).setLabel('✌️ Scissors').setStyle(ButtonStyle.Secondary),
      );
      const p1 = await interaction.guild.members.fetch(g.p1);
      return interaction.update({ content: `✊ **Rock Paper Scissors**\n${p1} vs ${freshMember}\n\nBoth pick your move!`, components: [row] });
    }
    if (type === 'ttt') {
      g.board = Array(9).fill(''); g.turn = g.p1;
      const p1 = await interaction.guild.members.fetch(g.p1);
      const rows = buildTttRows(g.board, gid, false);
      rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('_').setLabel(`❌ ${p1.displayName}'s turn`).setStyle(ButtonStyle.Secondary).setDisabled(true)));
      return interaction.update({ content: `❌⭕ **Tic Tac Toe** — ${p1} vs ${freshMember}`, components: rows });
    }
    if (type === 'c4') {
      g.board = newC4(); g.turn = g.p1;
      const p1 = await interaction.guild.members.fetch(g.p1);
      const embed = new EmbedBuilder().setTitle('🟡 Connect 4').setDescription(renderC4(g.board)).setColor(0x00c8ff).setFooter({text:`🔴 ${p1.displayName} vs 🟡 ${freshMember.displayName} — 🔴 goes first`});
      return interaction.update({ content: '', embeds: [embed], components: [c4Buttons(gid, g.board, false)] });
    }
    if (type === 'hl') {
      g.number = Math.floor(Math.random()*100)+1; g.p1guess = null; g.p2guess = null;
      const p1 = await interaction.guild.members.fetch(g.p1);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`hl_${gid}`).setLabel('🔢 Make Your Guess (1–100)').setStyle(ButtonStyle.Primary));
      return interaction.update({ content: `🔢 **Higher or Lower**\n${p1} vs ${freshMember}\n\nI've picked a number 1–100. Both guess — closest wins!`, components: [row] });
    }
  }

  // DECLINE CHALLENGE
  if (interaction.customId.startsWith('game_dec_')) {
    const gid = interaction.customId.replace('game_dec_', '');
    const g = games.get(gid);
    if (g) games.delete(gid);
    return interaction.update({ content: '❌ Challenge declined.', components: [] });
  }

  // RPS PICK
  if (interaction.customId.startsWith('rps_')) {
    const [,gid,pick] = interaction.customId.split('_');
    const g = games.get(gid);
    if (!g || g.status !== 'active') return interaction.reply({ content: '❌ Game not found.', ephemeral: true });
    if (interaction.user.id !== g.p1 && interaction.user.id !== g.p2) return interaction.reply({ content: '❌ You\'re not in this game.', ephemeral: true });
    const isP1 = interaction.user.id === g.p1;
    if (isP1 && g.p1pick) return interaction.reply({ content: '✅ Already picked!', ephemeral: true });
    if (!isP1 && g.p2pick) return interaction.reply({ content: '✅ Already picked!', ephemeral: true });
    if (isP1) g.p1pick = pick; else g.p2pick = pick;
    if (!g.p1pick || !g.p2pick) return interaction.reply({ content: '✅ Locked in! Waiting for opponent...', ephemeral: true });
    // Both picked — reveal
    const names = { r:'✊ Rock', p:'✋ Paper', s:'✌️ Scissors' };
    const beats = { r:'s', p:'r', s:'p' };
    const p1m = await interaction.guild.members.fetch(g.p1);
    const p2Name = g.p2 === BOT_ID ? '🤖 Bot' : (await interaction.guild.members.fetch(g.p2)).displayName;
    let result;
    if (g.p1pick === g.p2pick) result = "It's a **draw**!";
    else if (beats[g.p1pick] === g.p2pick) result = `🏆 **${p1m.displayName}** wins!`;
    else result = `🏆 **${p2Name}** wins!`;
    const p1id = g.p1, p2id = g.p2;
    games.delete(gid);
    const rematchRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rematch_duel_${p1id}_${p2id}`).setLabel('⚔️ Rematch').setStyle(ButtonStyle.Primary),
    );
    return interaction.update({ content: `✊ **Rock Paper Scissors Result**\n${p1m}: ${names[g.p1pick]}\n${p2Name}: ${names[g.p2pick]}\n\n${result}`, components: [rematchRow] });
  }

  // TTT MOVE
  if (interaction.customId.startsWith('ttt_')) {
    const parts = interaction.customId.split('_');
    const gid = parts[1], cell = parseInt(parts[2]);
    const g = games.get(gid);
    if (!g || g.status !== 'active') return interaction.reply({ content: '❌ Game not found.', ephemeral: true });
    if (interaction.user.id !== g.turn) return interaction.reply({ content: '❌ Not your turn!', ephemeral: true });
    if (g.board[cell]) return interaction.reply({ content: '❌ Cell taken.', ephemeral: true });
    const symbol = interaction.user.id === g.p1 ? 'X' : 'O';
    g.board[cell] = symbol;
    const winner = tttWinner(g.board);
    const tttP1m = await interaction.guild.members.fetch(g.p1);
    const p2Name = g.p2 === BOT_ID ? '🤖 Bot' : (await interaction.guild.members.fetch(g.p2))?.displayName;
    if (winner) {
      games.delete(gid);
      const rows = buildTttRows(g.board, gid, true);
      const msg = winner === 'draw' ? "It's a **draw**!" : `🏆 **${winner === 'X' ? tttP1m.displayName : p2Name}** wins!`;
      rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('_done').setLabel(msg).setStyle(ButtonStyle.Secondary).setDisabled(true)));
      return interaction.update({ components: rows });
    }
    g.turn = g.turn === g.p1 ? g.p2 : g.p1;
    // Bot's turn
    if (g.turn === BOT_ID) {
      const botCell = botTTT(g.board);
      if (botCell >= 0) {
        g.board[botCell] = 'O';
        const botWin = tttWinner(g.board);
        g.turn = g.p1;
        const rows2 = buildTttRows(g.board, gid, !!botWin);
        if (botWin) {
          games.delete(gid);
          const msg2 = botWin === 'draw' ? "It's a **draw**!" : `🏆 **🤖 Bot** wins!`;
          rows2.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('_done2').setLabel(msg2).setStyle(ButtonStyle.Secondary).setDisabled(true)));
        } else {
          rows2.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('_').setLabel(`❌ ${tttP1m.displayName}'s turn`).setStyle(ButtonStyle.Secondary).setDisabled(true)));
        }
        return interaction.update({ components: rows2 });
      }
    }
    const nextName = g.turn === BOT_ID ? '🤖 Bot' : (await interaction.guild.members.fetch(g.turn))?.displayName;
    const rows = buildTttRows(g.board, gid, false);
    rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('_').setLabel(`${symbol === 'X' ? '⭕' : '❌'} ${nextName}'s turn`).setStyle(ButtonStyle.Secondary).setDisabled(true)));
    return interaction.update({ components: rows });
  }

  // CONNECT 4 DROP
  if (interaction.customId.startsWith('c4_')) {
    const parts = interaction.customId.split('_');
    const gid = parts[1], col = parseInt(parts[2]);
    const g = games.get(gid);
    if (!g || g.status !== 'active') return interaction.reply({ content: '❌ Game not found.', ephemeral: true });
    if (interaction.user.id !== g.turn) return interaction.reply({ content: '❌ Not your turn!', ephemeral: true });
    const player = interaction.user.id === g.p1 ? 1 : 2;
    if (!dropC4(g.board, col, player)) return interaction.reply({ content: '❌ Column full!', ephemeral: true });
    const p1m = await interaction.guild.members.fetch(g.p1);
    const p2Name = g.p2 === BOT_ID ? '🤖 Bot' : (await interaction.guild.members.fetch(g.p2))?.displayName ?? 'Player 2';
    if (checkC4(g.board, player)) {
      games.delete(gid);
      const winName = player === 1 ? p1m.displayName : p2Name;
      const embed = new EmbedBuilder().setTitle('🟡 Connect 4').setDescription(renderC4(g.board)).setColor(0x00c8ff).setFooter({text:`🏆 ${winName} wins!`});
      return interaction.update({ embeds: [embed], components: [] });
    }
    if (g.board[0].every(c=>c!==0)) {
      games.delete(gid);
      const embed = new EmbedBuilder().setTitle('🟡 Connect 4').setDescription(renderC4(g.board)).setColor(0x00c8ff).setFooter({text:"It's a draw!"});
      return interaction.update({ embeds: [embed], components: [] });
    }
    g.turn = g.turn === g.p1 ? g.p2 : g.p1;
    // Bot's turn
    if (g.turn === BOT_ID) {
      const botCol = botC4(g.board);
      dropC4(g.board, botCol, 2);
      g.turn = g.p1;
      if (checkC4(g.board, 2)) {
        games.delete(gid);
        const embed = new EmbedBuilder().setTitle('🟡 Connect 4').setDescription(renderC4(g.board)).setColor(0x00c8ff).setFooter({text:'🏆 🤖 Bot wins!'});
        return interaction.update({ embeds: [embed], components: [] });
      }
      const embed2 = new EmbedBuilder().setTitle('🟡 Connect 4 vs 🤖 Bot').setDescription(renderC4(g.board)).setColor(0x00c8ff).setFooter({text:`🔴 ${p1m.displayName}'s turn`});
      return interaction.update({ embeds: [embed2], components: [c4Buttons(gid, g.board, false)] });
    }
    const nextName = g.turn === BOT_ID ? '🤖 Bot' : p2Name;
    const embed = new EmbedBuilder().setTitle('🟡 Connect 4').setDescription(renderC4(g.board)).setColor(0x00c8ff).setFooter({text:`🔴 ${p1m.displayName} vs 🟡 ${p2Name} — ${player===1?'🟡':'🔴'} ${nextName}'s turn`});
    return interaction.update({ embeds: [embed], components: [c4Buttons(gid, g.board, false)] });
  }

  // HIGHER OR LOWER GUESS
  if (interaction.customId.startsWith('hl_')) {
    const gid = interaction.customId.replace('hl_', '');
    const g = games.get(gid);
    if (!g || g.status !== 'active') return interaction.reply({ content: '❌ Game not found.', ephemeral: true });
    if (interaction.user.id !== g.p1 && interaction.user.id !== g.p2) return interaction.reply({ content: '❌ You\'re not in this game.', ephemeral: true });
    const isP1 = interaction.user.id === g.p1;
    if (isP1 && g.p1guess !== null) return interaction.reply({ content: '✅ Already guessed!', ephemeral: true });
    if (!isP1 && g.p2guess !== null) return interaction.reply({ content: '✅ Already guessed!', ephemeral: true });
    const modal = new ModalBuilder().setCustomId(`hl_modal_${gid}`).setTitle('Guess the Number (1–100)');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('hl_guess').setLabel('Your guess (1–100)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)
    ));
    return interaction.showModal(modal);
  }

  // TEST WELCOME (admin only)
  if (interaction.customId === 'test_welcome') {
    if (!freshMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
    }
    const channels = await interaction.guild.channels.fetch();
    const welcomeChannel =
      channels.find(c => c?.name === 'welcome') ??
      channels.find(c => c?.name === 'announcements') ??
      channels.find(c => c?.name === 'general');
    if (!welcomeChannel) {
      return interaction.reply({ content: '❌ No welcome/announcements/general channel found.', ephemeral: true });
    }
    const embed = new EmbedBuilder()
      .setTitle('◈ A NEW CHALLENGER APPROACHES')
      .setDescription(
        `Welcome ${freshMember}, to **The League**! 🎉\n\n` +
        `→ Read the rules and register in <#${channels.find(c => c?.name === 'rules')?.id ?? ''}>\n` +
        `→ Pick your roles in <#${channels.find(c => c?.name === 'get-roles')?.id ?? ''}>`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .setColor(0x00c8ff)
      .setFooter({ text: `Member #${interaction.guild.memberCount}` })
      .setTimestamp();
    await welcomeChannel.send({ content: `👋 ${freshMember}`, embeds: [embed] }).catch(() => {});
    return interaction.reply({ content: `✅ Welcome message sent to ${welcomeChannel}`, ephemeral: true });
  }

  // REGISTER
  if (interaction.customId === 'register') {
    if (freshMember.roles.cache.has(client.roles.member)) {
      return interaction.editReply({ content: '✅ You are already registered!' });
    }
    try {
      await freshMember.roles.add(client.roles.member);
      await freshMember.roles.remove(client.roles.newArrival).catch(() => {});
      return interaction.editReply({ content: '🎉 Welcome to **The League**! You now have access to all channels.\nHead to **#get-roles** to pick your roles.' });
    } catch (e) {
      return interaction.editReply({ content: '❌ Registration failed — contact staff.' });
    }
  }

  // PRIVATE ROOM — SET PASSWORD
  if (interaction.customId.startsWith('room_setpw_')) {
    const roomId = interaction.customId.replace('room_setpw_', '');
    const room = privateRooms.get(roomId);
    if (!room) return interaction.reply({ content: '❌ Room no longer exists.', ephemeral: true });
    if (room.ownerId !== interaction.user.id) return interaction.reply({ content: '❌ Only the room owner can set the password.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId(`room_pw_modal_${roomId}`).setTitle('Set Room Password');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('room_password').setLabel('Password').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)
    ));
    return interaction.showModal(modal);
  }

  // PRIVATE ROOM — JOIN
  if (interaction.customId.startsWith('room_join_')) {
    const roomId = interaction.customId.replace('room_join_', '');
    const room = privateRooms.get(roomId);
    if (!room) return interaction.reply({ content: '❌ Room no longer exists.', ephemeral: true });
    if (!room.password) return interaction.reply({ content: '❌ The owner hasn\'t set a password yet.', ephemeral: true });
    if (room.ownerId === interaction.user.id) return interaction.reply({ content: '✅ You\'re the owner — you\'re already in!', ephemeral: true });
    const modal = new ModalBuilder().setCustomId(`room_join_modal_${roomId}`).setTitle('Enter Room Password');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('room_password').setLabel('Password').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)
    ));
    return interaction.showModal(modal);
  }

  // Must be registered for everything below
  if (!freshMember.roles.cache.has(client.roles.member)) {
    return interaction.reply({ content: '❌ You must register first in **#rules**.', ephemeral: true });
  }

  // VERIFIED PLAYER
  if (interaction.customId === 'toggle_verified') {
    if (freshMember.roles.cache.has(client.roles.verified)) {
      await freshMember.roles.remove(client.roles.verified);
      return interaction.reply({ content: '✅ Removed **Verified Player** role', ephemeral: true });
    }
    const modal = new ModalBuilder().setCustomId('verify_modal').setTitle('Link Your The League Account');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('username_input').setLabel('Your username or Riot ID from the app').setStyle(TextInputStyle.Short).setPlaceholder('e.g. WildRifter#1234').setRequired(true).setMaxLength(60)
    ));
    return interaction.showModal(modal);
  }

  // LANE SELECT
  if (interaction.customId === 'lane_select') {
    const selectedLane = interaction.values[0];
    const lane = LANES.find(l => l.key === selectedLane);
    if (!lane) return interaction.reply({ content: '❌ Invalid lane.', ephemeral: true });

    // Remove all other lane roles first
    for (const l of LANES) {
      const roleId = client.roles[`lane_${l.key}`];
      if (roleId && freshMember.roles.cache.has(roleId)) {
        await freshMember.roles.remove(roleId).catch(() => {});
      }
    }
    // Assign selected lane role
    const laneRoleId = client.roles[`lane_${selectedLane}`];
    if (laneRoleId) await freshMember.roles.add(laneRoleId).catch(() => {});
    return interaction.reply({ content: `${lane.emoji} You've been assigned **${lane.name}**!`, ephemeral: true });
  }

  // RANK SELECT
  if (interaction.customId === 'rank_select') {
    const selectedRank = interaction.values[0];
    const rank = RANKS.find(r => r.key === selectedRank);
    if (!rank) return interaction.reply({ content: '❌ Invalid rank.', ephemeral: true });

    const modal = new ModalBuilder().setCustomId(`rank_modal_${selectedRank}`).setTitle(`Claim ${rank.name} Rank`);
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('rank_username').setLabel('Your username or Riot ID from the app').setStyle(TextInputStyle.Short).setPlaceholder('e.g. WildRifter#1234').setRequired(true).setMaxLength(60)
    ));
    return interaction.showModal(modal);
  }

  } catch (e) {
    console.error('Button handler error:', e);
    const errMsg = { content: '❌ Something went wrong.', ephemeral: true };
    if (isSlow) interaction.editReply(errMsg).catch(() => {});
    else interaction.reply(errMsg).catch(() => {});
  }
});

// ── MODAL SUBMISSIONS ────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isModalSubmit()) return;

  // H/L guess modal (needs to edit the game message, not defer)
  if (interaction.customId.startsWith('hl_modal_')) {
    const gid = interaction.customId.replace('hl_modal_', '');
    const g = games.get(gid);
    if (!g) return interaction.reply({ content: '❌ Game not found.', ephemeral: true });
    const raw = interaction.fields.getTextInputValue('hl_guess');
    const guess = parseInt(raw);
    if (isNaN(guess) || guess < 1 || guess > 100) return interaction.reply({ content: '❌ Enter a number between 1 and 100.', ephemeral: true });
    const isP1 = interaction.user.id === g.p1;
    if (isP1) g.p1guess = guess; else g.p2guess = guess;
    if (g.p1guess === null || g.p2guess === null) return interaction.reply({ content: `✅ Guessed **${guess}**! Waiting for opponent...`, ephemeral: true });
    // Both guessed
    const [p1m, p2m] = await Promise.all([interaction.guild.members.fetch(g.p1), interaction.guild.members.fetch(g.p2)]);
    const d1 = Math.abs(g.p1guess - g.number), d2 = Math.abs(g.p2guess - g.number);
    let result;
    if (d1 === d2) result = "It's a **draw**!";
    else if (d1 < d2) result = `🏆 **${p1m.displayName}** wins!`;
    else result = `🏆 **${p2m.displayName}** wins!`;
    games.delete(gid);
    const ch = interaction.guild.channels.cache.get(g.channelId);
    await ch?.send({ content: `🔢 **Higher or Lower Result**\nThe number was **${g.number}**!\n${p1m}: guessed **${g.p1guess}**\n${p2m}: guessed **${g.p2guess}**\n\n${result}` }).catch(() => {});
    return interaction.reply({ content: `✅ Guessed **${guess}**! Results posted.`, ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);

  // Helper: find user in Supabase by riot_id or username
  async function findUser(input) {
    let { data } = await supabase.from('users').select('id, riot_id, username, lp').ilike('riot_id', input).maybeSingle();
    if (!data) {
      const res = await supabase.from('users').select('id, riot_id, username, lp').ilike('username', input).maybeSingle();
      data = res.data;
    }
    return data;
  }

  // PRIVATE ROOM — SET PASSWORD modal
  if (interaction.customId.startsWith('room_pw_modal_')) {
    const roomId = interaction.customId.replace('room_pw_modal_', '');
    const room = privateRooms.get(roomId);
    if (!room) return interaction.editReply({ content: '❌ Room no longer exists.' });
    const password = interaction.fields.getTextInputValue('room_password').trim();
    room.password = password;

    // Update lobby embed
    if (client.roomLobbyChannelId && room.lobbyMessageId) {
      const lobby = interaction.guild.channels.cache.get(client.roomLobbyChannelId);
      const msg = await lobby?.messages.fetch(room.lobbyMessageId).catch(() => null);
      if (msg) {
        const updated = EmbedBuilder.from(msg.embeds[0]).setDescription(
          msg.embeds[0].description.replace('**Password:** Not set yet', '**Password:** ✅ Set')
        );
        await msg.edit({ embeds: [updated] }).catch(() => {});
      }
    }
    return interaction.editReply({ content: '🔑 Password set! Others can now click **Join Room** to enter.' });
  }

  // PRIVATE ROOM — JOIN modal
  if (interaction.customId.startsWith('room_join_modal_')) {
    const roomId = interaction.customId.replace('room_join_modal_', '');
    const room = privateRooms.get(roomId);
    if (!room) return interaction.editReply({ content: '❌ Room no longer exists.' });
    const entered = interaction.fields.getTextInputValue('room_password').trim();
    if (entered !== room.password) return interaction.editReply({ content: '❌ Wrong password.' });

    const voiceChannel = interaction.guild.channels.cache.get(roomId);
    if (!voiceChannel) return interaction.editReply({ content: '❌ Room channel not found.' });
    await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true, Connect: true,
    }).catch(() => {});
    return interaction.editReply({ content: `✅ Access granted! Join **${voiceChannel.name}** in the Private Rooms section.` });
  }

  // VERIFIED PLAYER modal
  if (interaction.customId === 'verify_modal') {
    const input = interaction.fields.getTextInputValue('username_input').trim();
    const user = await findUser(input);
    if (!user) {
      return interaction.editReply({ content: `❌ No account found for **${input}**.\nRegister at https://the-leagueapp.netlify.app first.` });
    }
    await member.roles.add(client.roles.verified).catch(() => {});
    // Store Discord ID for rank sync
    await supabase.from('users').update({ discord_id: interaction.user.id }).eq('id', user.id);
    return interaction.editReply({ content: `✅ Account **${user.riot_id ?? user.username}** verified!\nYou now have the **✅ Verified Player** role 🎉` });
  }

  // RANK modal
  if (interaction.customId.startsWith('rank_modal_')) {
    const rankKey = interaction.customId.replace('rank_modal_', '');
    const claimedRank = RANKS.find(r => r.key === rankKey);
    if (!claimedRank) return interaction.editReply({ content: '❌ Invalid rank.' });

    const input = interaction.fields.getTextInputValue('rank_username').trim();
    const user = await findUser(input);
    if (!user) {
      return interaction.editReply({ content: `❌ No account found for **${input}**.\nRegister at https://the-leagueapp.netlify.app first.` });
    }

    const lp = user.lp ?? 0;
    const actualRank = getRankForLP(lp);

    if (actualRank.key !== claimedRank.key) {
      return interaction.editReply({
        content: `❌ Your rank in The League is **${actualRank.name}** (${lp} LP) — not ${claimedRank.name}.\nYou can only claim the rank that matches your LP in the app.`
      });
    }

    // Remove all existing rank roles first
    for (const rank of RANKS) {
      const roleId = client.roles[rank.key];
      if (roleId && member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId).catch(() => {});
      }
    }

    // Assign correct rank role
    const rankRoleId = client.roles[rankKey];
    if (rankRoleId) await member.roles.add(rankRoleId).catch(() => {});

    // Store Discord ID for rank sync
    await supabase.from('users').update({ discord_id: interaction.user.id }).eq('id', user.id);

    return interaction.editReply({
      content: `🏆 Verified! **${user.riot_id ?? user.username}** is **${actualRank.name}** (${lp} LP).\nYou now have the **${actualRank.name}** role!`
    });
  }

  } catch (e) {
    console.error('Modal handler error:', e);
    interaction.editReply({ content: '❌ Something went wrong. Please try again.' }).catch(() => {});
  }
});

// ── AUTO RANK SYNC + PLAYER STATS ────────────────────────────────
async function syncRanksAndStats() {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const { data: users } = await supabase
      .from('users')
      .select('id, discord_id, riot_id, username, lp')
      .not('discord_id', 'is', null);

    if (!users?.length) return;

    let updated = 0;
    for (const user of users) {
      const member = await guild.members.fetch(user.discord_id).catch(() => null);
      if (!member) continue;

      const lp = user.lp ?? 0;
      const correctRank = getRankForLP(lp);
      const correctRoleId = client.roles?.[correctRank.key];

      // Check if rank roles need updating
      const hasCorrect = correctRoleId && member.roles.cache.has(correctRoleId);
      const hasWrong   = RANKS.some(r => r.key !== correctRank.key && client.roles?.[r.key] && member.roles.cache.has(client.roles[r.key]));

      if (!hasCorrect || hasWrong) {
        for (const rank of RANKS) {
          const roleId = client.roles?.[rank.key];
          if (roleId && member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(() => {});
        }
        if (correctRoleId) await member.roles.add(correctRoleId).catch(() => {});
        updated++;
        console.log(`🔄 Rank synced: ${user.username} → ${correctRank.name} (${lp} LP)`);
      }
    }

    // Refresh player stats channel
    if (client.statsChannelId) {
      const statsCh = guild.channels.cache.get(client.statsChannelId);
      if (statsCh) {
        const existing = await statsCh.messages.fetch({ limit: 20 });
        for (const [, m] of existing.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});

        const sorted = [...users].sort((a, b) => (b.lp ?? 0) - (a.lp ?? 0));
        const medals = ['🥇','🥈','🥉'];
        const embed = new EmbedBuilder()
          .setTitle('◈ VERIFIED PLAYER STATS')
          .setDescription(
            sorted.map((u, i) => {
              const rank = getRankForLP(u.lp ?? 0);
              return `${medals[i] ?? `**${i+1}.**`} **${u.riot_id ?? u.username}** — ${rank.name} • ${u.lp ?? 0} LP${u.discord_id ? ` • <@${u.discord_id}>` : ''}`;
            }).join('\n') || 'No verified players yet.'
          )
          .setColor(0x00c8ff)
          .setFooter({ text: `${sorted.length} verified players • syncs every 5 min` })
          .setTimestamp();
        await statsCh.send({ embeds: [embed] }).catch(() => {});
      }
    }

    if (updated) console.log(`🔄 Rank sync complete — ${updated} roles updated`);
  } catch (e) {
    console.error('Rank sync error:', e.message);
  }
}

client.once('ready', async () => {
  // Set up player stats channel
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    const channels = await guild.channels.fetch();
    let statsCh = channels.find(c => c?.name === 'player-stats' && c.type === ChannelType.GuildText);
    if (!statsCh) {
      statsCh = await guild.channels.create({
        name: 'player-stats',
        type: ChannelType.GuildText,
        topic: '📊 Live stats for all verified players — auto-synced every 5 minutes',
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: client.roles?.member ?? guild.roles.everyone, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
        ],
      }).catch(() => null);
    }
    client.statsChannelId = statsCh?.id ?? null;
  }

  // Start sync interval
  await syncRanksAndStats();
  setInterval(syncRanksAndStats, 5 * 60 * 1000);
  console.log('✅ Rank sync + player stats active');
});

client.login(TOKEN);
