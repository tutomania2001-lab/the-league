import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } from 'discord.js';
import { createClient } from '@supabase/supabase-js';

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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences],
});

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

    const embed = new EmbedBuilder()
      .setTitle('◈ SELECT YOUR ROLES')
      .setDescription(
        '**✅ Verified Player** — Link your The League app account\n' +
        '**🏆 Rank Role** — Select your rank from the dropdown. Your LP in the app must match.\n\n' +
        '> Only your exact rank will be assigned — you cannot claim a rank you haven\'t earned in the app.\n' +
        '> Rank roles update when your LP changes in the app.'
      )
      .setColor(0x00c8ff)
      .setFooter({ text: '⚠️ Admin and Moderator roles are assigned by staff only' });

    await getRolesChannel.send({ embeds: [embed], components: [verifiedRow, rankRow] });
    console.log('✅ Role selector with rank dropdown posted');
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

// ── BUTTON INTERACTIONS ──────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const freshMember = await interaction.guild.members.fetch(interaction.user.id);

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
});

// ── MODAL SUBMISSIONS ────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isModalSubmit()) return;

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
