import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID environment variables');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once('clientReady', async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);
  const guildRoles = await guild.roles.fetch();
  const guildChannels = await guild.channels.fetch();

  // Map roles
  const roles = {};
  for (const [id, role] of guildRoles) {
    if (role.name.includes('New Arrival'))     roles.newArrival = id;
    if (role.name.includes('Member') && !role.name.includes('New')) roles.member = id;
    if (role.name.includes('Verified Player')) roles.verified = id;
    if (role.name.includes('Challenger'))      roles.challenger = id;
    if (role.name.includes('Admin'))           roles.admin = id;
    if (role.name === '@everyone')             roles.everyone = id;
  }
  client.roles = roles;
  console.log('Roles mapped:', Object.keys(roles));

  // ── LOCK ALL CHANNELS: only Member+ can see them ──────────────
  // Allow: rules, announcements, app-download (visible to everyone)
  const publicChannels = ['rules', 'announcements', 'app-download'];

  for (const [, channel] of guildChannels) {
    if (!channel.permissionsFor) continue;
    if (channel.isVoiceBased?.()) continue; // skip voice for now

    const isPublic = publicChannels.includes(channel.name);

    if (!isPublic && channel.type !== 4) { // 4 = category
      try {
        await channel.permissionOverwrites.edit(roles.everyone, {
          ViewChannel: false,
        });
        await channel.permissionOverwrites.edit(roles.member, {
          ViewChannel: true,
        });
        console.log(`🔒 Locked #${channel.name}`);
      } catch (e) {
        console.log(`⚠️  Could not lock #${channel.name}:`, e.message);
      }
    }
  }

  // ── ASSIGN NEW ARRIVAL to anyone without Member role ─────────
  const members = await guild.members.fetch();
  for (const [, member] of members) {
    if (member.user.bot) continue;
    const hasMember = member.roles.cache.has(roles.member);
    const hasNewArrival = member.roles.cache.has(roles.newArrival);
    if (!hasMember && !hasNewArrival) {
      await member.roles.add(roles.newArrival).catch(() => {});
    }
  }

  // ── POST REGISTER BUTTON in #rules ───────────────────────────
  const rulesChannel = guildChannels.find(c => c.name === 'rules');
  if (rulesChannel) {
    const existing = await rulesChannel.messages.fetch({ limit: 20 });
    const botMsgs = existing.filter(m => m.author.id === client.user.id);
    for (const [, m] of botMsgs) await m.delete().catch(() => {});

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('register')
        .setLabel('✅ I have read the rules — Register')
        .setStyle(ButtonStyle.Success),
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
        '**Click the button below to register and access the server.**'
      )
      .setColor(0x00c8ff)
      .setFooter({ text: 'The League — Wild Rift Tournament Platform' });

    await rulesChannel.send({ embeds: [embed], components: [row] });
    console.log('✅ Registration button posted in #rules');
  }

  // ── POST ROLE SELECTOR in #get-roles ─────────────────────────
  const getRolesChannel = guildChannels.find(c => c.name === 'get-roles');
  if (getRolesChannel) {
    const existing = await getRolesChannel.messages.fetch({ limit: 10 });
    const alreadyPosted = existing.some(m => m.author.id === client.user.id && m.embeds.length > 0);

    if (!alreadyPosted) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle_verified').setLabel('✅ Verified Player').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('toggle_challenger').setLabel('💎 Challenger').setStyle(ButtonStyle.Secondary),
      );

      const embed = new EmbedBuilder()
        .setTitle('◈ SELECT YOUR ROLES')
        .setDescription('Click to add or remove optional roles. Click again to remove.')
        .setColor(0x00c8ff)
        .addFields(
          { name: '✅ Verified Player', value: 'Registered on The League app' },
          { name: '💎 Challenger', value: 'High-rank competitive Wild Rift player' },
        )
        .setFooter({ text: '⚠️ Admin and Moderator roles are assigned by staff only' });

      await getRolesChannel.send({ embeds: [embed], components: [row] });
      console.log('✅ Role selector posted in #get-roles');
    }
  }
});

// ── NEW MEMBER: auto-assign New Arrival ──────────────────────────
client.on('guildMemberAdd', async member => {
  if (member.user.bot) return;
  const newArrivalId = client.roles?.newArrival;
  if (newArrivalId) await member.roles.add(newArrivalId).catch(() => {});
  console.log(`👋 New member: ${member.user.tag} — assigned New Arrival`);
});

// ── BUTTON INTERACTIONS ──────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const { customId, member } = interaction;

  // REGISTER button
  if (customId === 'register') {
    // Force-fetch fresh member data to avoid stale cache
    const freshMember = await interaction.guild.members.fetch(interaction.user.id);
    const hasMember = freshMember.roles.cache.has(client.roles.member);
    if (hasMember) {
      return interaction.reply({ content: '✅ You are already registered!', ephemeral: true });
    }
    try {
      await freshMember.roles.add(client.roles.member);
      await freshMember.roles.remove(client.roles.newArrival).catch(() => {});
      return interaction.reply({
        content: '🎉 Welcome to **The League**! You now have access to all channels.\nHead to **#get-roles** to pick your optional roles.',
        ephemeral: true
      });
    } catch (e) {
      console.error('Register error:', e.message);
      return interaction.reply({ content: '❌ Registration failed — contact staff.', ephemeral: true });
    }
  }

  // VERIFIED PLAYER — show modal to enter Riot ID
  if (customId === 'toggle_verified') {
    const freshMember2 = await interaction.guild.members.fetch(interaction.user.id);
    if (!freshMember2.roles.cache.has(client.roles.member)) {
      return interaction.reply({ content: '❌ You must register first in **#rules**.', ephemeral: true });
    }
    // If already verified, remove the role
    if (freshMember2.roles.cache.has(client.roles.verified)) {
      await freshMember2.roles.remove(client.roles.verified);
      return interaction.reply({ content: '✅ Removed **Verified Player** role', ephemeral: true });
    }
    // Show modal asking for Riot ID
    const modal = new ModalBuilder()
      .setCustomId('verify_riot_modal')
      .setTitle('Verify Your The League Account');
    const riotInput = new TextInputBuilder()
      .setCustomId('riot_id_input')
      .setLabel('Your Riot ID (e.g. PlayerName#EUW)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Name#TAG')
      .setRequired(true)
      .setMaxLength(50);
    modal.addComponents(new ActionRowBuilder().addComponents(riotInput));
    return interaction.showModal(modal);
  }

  // CHALLENGER — requires Diamond+ rank in The League app
  if (customId === 'toggle_challenger') {
    const freshMember2 = await interaction.guild.members.fetch(interaction.user.id);
    if (!freshMember2.roles.cache.has(client.roles.member)) {
      return interaction.reply({ content: '❌ You must register first in **#rules**.', ephemeral: true });
    }
    // If already has role, remove it
    if (freshMember2.roles.cache.has(client.roles.challenger)) {
      await freshMember2.roles.remove(client.roles.challenger);
      return interaction.reply({ content: '✅ Removed **Challenger** role', ephemeral: true });
    }
    // Show modal to enter Riot ID for rank check
    const modal = new ModalBuilder()
      .setCustomId('verify_challenger_modal')
      .setTitle('Verify Your Rank');
    const riotInput = new TextInputBuilder()
      .setCustomId('challenger_riot_id')
      .setLabel('Your Riot ID (e.g. PlayerName#EUW)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Name#TAG')
      .setRequired(true)
      .setMaxLength(50);
    modal.addComponents(new ActionRowBuilder().addComponents(riotInput));
    return interaction.showModal(modal);
  }
});

// ── MODAL SUBMIT: Challenger rank verification ────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== 'verify_challenger_modal') return;

  await interaction.deferReply({ ephemeral: true });

  const riotId = interaction.fields.getTextInputValue('challenger_riot_id').trim();

  // Search by riot_id OR username
  let { data } = await supabase.from('users').select('id, riot_id, username, lp').ilike('riot_id', riotId).maybeSingle();
  if (!data) {
    const res = await supabase.from('users').select('id, riot_id, username, lp').ilike('username', riotId).maybeSingle();
    data = res.data;
  }

  if (!data) {
    return interaction.editReply({
      content: `❌ No account found for **${riotId}**.\nMake sure you've registered on The League app: https://the-leagueapp.netlify.app`
    });
  }

  const lp = data.lp ?? 0;
  const ABOVE_DIAMOND_LP = 2800;
  if (lp < ABOVE_DIAMOND_LP) {
    const currentTier = lp >= 2400 ? 'Diamond' : lp >= 2000 ? 'Emerald' : lp >= 1600 ? 'Platinum' : lp >= 1200 ? 'Gold' : 'below Gold';
    return interaction.editReply({
      content: `❌ Your rank is **${currentTier}** (${lp} LP).\nYou need **Master or above** (2800+ LP) to claim the Challenger role.`
    });
  }

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await member.roles.add(client.roles.challenger);
    return interaction.editReply({
      content: `💎 Verified! Account **${data.riot_id ?? data.username}** is at **${lp} LP**.\nYou now have the **💎 Challenger** role 🎉`
    });
  } catch (e) {
    return interaction.editReply({ content: '❌ Could not assign role — contact staff.' });
  }
});

// ── MODAL SUBMIT: Riot ID verification ───────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== 'verify_riot_modal') return;

  await interaction.deferReply({ ephemeral: true });

  const riotId = interaction.fields.getTextInputValue('riot_id_input').trim();

  // Search by riot_id OR username
  let { data } = await supabase.from('users').select('id, riot_id, username').ilike('riot_id', riotId).maybeSingle();
  if (!data) {
    const res = await supabase.from('users').select('id, riot_id, username').ilike('username', riotId).maybeSingle();
    data = res.data;
  }

  if (!data) {
    return interaction.editReply({
      content: `❌ No account found for **${riotId}**.\nMake sure you've registered on The League app: https://the-leagueapp.netlify.app`
    });
  }

  // Assign verified role
  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await member.roles.add(client.roles.verified);
    return interaction.editReply({
      content: `✅ Verified! Your account **${data.riot_id ?? data.username}** is linked to The League.\nYou now have the **✅ Verified Player** role 🎉`
    });
  } catch (e) {
    console.error('Verify role error:', e.message);
    return interaction.editReply({ content: '❌ Could not assign role — contact staff.' });
  }
});

client.login(TOKEN);
