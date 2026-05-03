import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import RSSParser from 'rss-parser';

const rssParser = new RSSParser();
const WILDRIFT_FEED = 'https://wildrift.leagueoflegends.com/en-gb/news/rss.xml';
const seenArticles = new Set();

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

  // Lock all channels except public ones
  const publicChannels = ['rules', 'announcements', 'app-download', 'commands'];
  for (const [, channel] of guildChannels) {
    if (!channel.permissionsFor || channel.type === 4) continue;
    if (!publicChannels.includes(channel.name)) {
      try {
        await channel.permissionOverwrites.edit(roles.everyone, { ViewChannel: false });
        await channel.permissionOverwrites.edit(roles.member, { ViewChannel: true });
      } catch {}
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

  // Post Test Welcome button in #commands (admin only)
  const commandsChannel = guildChannels.find(c => c?.name === 'commands');
  if (commandsChannel) {
    const existing = await commandsChannel.messages.fetch({ limit: 20 });
    for (const [, m] of existing.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('test_welcome').setLabel('🎉 Test Welcome Message').setStyle(ButtonStyle.Primary),
    );
    await commandsChannel.send({ content: '**Admin Commands**', components: [row] }).catch(() => {});
    console.log('✅ Test welcome button posted in #commands');
  }

  // Post role selector in #get-roles
  const getRolesChannel = guildChannels.find(c => c.name === 'get-roles');
  if (getRolesChannel) {
    const existing = await getRolesChannel.messages.fetch({ limit: 20 });
    for (const [, m] of existing.filter(m => m.author.id === client.user.id)) await m.delete().catch(() => {});

    // Verified Player button
    const verifiedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('toggle_verified').setLabel('✅ Verified Player — Link your app account').setStyle(ButtonStyle.Primary),
    );

    // Rank select menu
    const rankMenu = new StringSelectMenuBuilder()
      .setCustomId('rank_select')
      .setPlaceholder('🏆 Claim your rank — enter your app username to verify')
      .addOptions(RANKS.map(r => ({ label: r.name, value: r.key, description: `${r.minLP}–${r.maxLP === 999999 ? '∞' : r.maxLP} LP` })));
    const rankRow = new ActionRowBuilder().addComponents(rankMenu);

    // Lane select menu
    const laneMenu = new StringSelectMenuBuilder()
      .setCustomId('lane_select')
      .setPlaceholder('🗺️ Select your main lane')
      .addOptions(LANES.map(l => ({ label: l.name, value: l.key })));
    const laneRow = new ActionRowBuilder().addComponents(laneMenu);

    const embed = new EmbedBuilder()
      .setTitle('◈ SELECT YOUR ROLES')
      .setDescription(
        '**✅ Verified Player** — Link your The League app account\n' +
        '**🏆 Rank Role** — Select your rank from the dropdown. Your LP in the app must match.\n' +
        '**🗺️ Lane Role** — Pick your main lane.\n\n' +
        '> Only your exact rank will be assigned — you cannot claim a rank you haven\'t earned in the app.\n' +
        '> Rank roles update when your LP changes in the app.'
      )
      .setColor(0x00c8ff)
      .setFooter({ text: '⚠️ Admin and Moderator roles are assigned by staff only' });

    await getRolesChannel.send({ embeds: [embed], components: [verifiedRow, rankRow, laneRow] });
    console.log('✅ Role selector with rank dropdown posted');
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

  async function checkWildRiftNews(channel) {
    try {
      const feed = await rssParser.parseURL(WILDRIFT_FEED);
      console.log(`📰 Feed fetched: ${feed.items.length} items`);
      for (const item of feed.items.slice(0, 5)) {
        const id = item.guid || item.link;
        if (seenArticles.has(id)) continue;
        seenArticles.add(id);
        const embed = new EmbedBuilder()
          .setTitle(item.title ?? 'Wild Rift News')
          .setURL(item.link ?? 'https://wildrift.leagueoflegends.com/en-gb/news/')
          .setDescription(item.contentSnippet?.slice(0, 400) ?? '')
          .setColor(0x00c8ff)
          .setFooter({ text: '📰 Wild Rift Official News' })
          .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());
        await channel.send({ embeds: [embed] }).catch(() => {});
        console.log(`📰 Posted: ${item.title}`);
      }
    } catch (e) {
      console.error('RSS feed error:', e.message);
    }
  }

  if (newsChannel) {
    await checkWildRiftNews(newsChannel); // post latest on startup
    setInterval(() => checkWildRiftNews(newsChannel), 30 * 60 * 1000);
    console.log('✅ Wild Rift news feed active');
  }

  } catch (e) {
    console.error('❌ clientReady error:', e);
  }
});

// New member → New Arrival + public welcome
client.on('guildMemberAdd', async member => {
  if (member.user.bot) return;
  if (client.roles?.newArrival) await member.roles.add(client.roles.newArrival).catch(() => {});
  console.log(`👋 ${member.user.tag} joined — New Arrival assigned`);

  const channels = await member.guild.channels.fetch();
  const welcomeChannel =
    channels.find(c => c?.name === 'welcome') ??
    channels.find(c => c?.name === 'announcements') ??
    channels.find(c => c?.name === 'general');
  if (!welcomeChannel) return;

  const embed = new EmbedBuilder()
    .setTitle('◈ A NEW CHALLENGER APPROACHES')
    .setDescription(
      `Welcome ${member}, to **The League**! 🎉\n\n` +
      `→ Read the rules and register in <#${channels.find(c => c?.name === 'rules')?.id ?? ''}>\n` +
      `→ Pick your roles in <#${channels.find(c => c?.name === 'get-roles')?.id ?? ''}>`
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setColor(0x00c8ff)
    .setFooter({ text: `Member #${member.guild.memberCount}` })
    .setTimestamp();

  await welcomeChannel.send({ content: `👋 ${member}`, embeds: [embed] }).catch(() => {});
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

// ── BUTTON INTERACTIONS ──────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  try {
  const freshMember = await interaction.guild.members.fetch(interaction.user.id);

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
    games.delete(gid);
    return interaction.update({ content: `✊ **Rock Paper Scissors Result**\n${p1m}: ${names[g.p1pick]}\n${p2Name}: ${names[g.p2pick]}\n\n${result}`, components: [] });
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
      return interaction.reply({ content: '✅ You are already registered!', ephemeral: true });
    }
    try {
      await freshMember.roles.add(client.roles.member);
      await freshMember.roles.remove(client.roles.newArrival).catch(() => {});
      return interaction.reply({ content: '🎉 Welcome to **The League**! You now have access to all channels.\nHead to **#get-roles** to pick your roles.', ephemeral: true });
    } catch (e) {
      return interaction.reply({ content: '❌ Registration failed — contact staff.', ephemeral: true });
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
      new TextInputBuilder().setCustomId('username_input').setLabel('Your username or Riot ID from the app').setStyle(TextInputStyle.Short).setPlaceholder('e.g. LeftRightSleep#2735').setRequired(true).setMaxLength(60)
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
      new TextInputBuilder().setCustomId('rank_username').setLabel('Your username or Riot ID from the app').setStyle(TextInputStyle.Short).setPlaceholder('e.g. LeftRightSleep#2735').setRequired(true).setMaxLength(60)
    ));
    return interaction.showModal(modal);
  }

  } catch (e) {
    console.error('Button handler error:', e);
    interaction.reply({ content: '❌ Something went wrong — check Railway logs.', ephemeral: true }).catch(() => {});
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

    return interaction.editReply({
      content: `🏆 Verified! **${user.riot_id ?? user.username}** is **${actualRank.name}** (${lp} LP).\nYou now have the **${actualRank.name}** role!`
    });
  }
});

client.login(TOKEN);
