import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID environment variables');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);
  const guildRoles = await guild.roles.fetch();

  const roleMap = {};
  for (const [id, role] of guildRoles) {
    if (role.name.includes('Verified Player')) roleMap['verified'] = id;
    if (role.name.includes('Challenger'))      roleMap['challenger'] = id;
    if (role.name.includes('Member') && !role.name.includes('New')) roleMap['member'] = id;
  }
  client.roleMap = roleMap;
  console.log('Roles mapped:', Object.keys(roleMap));

  // Post role selector if not already posted
  const channels = await guild.channels.fetch();
  const getRolesChannel = channels.find(c => c.name === 'get-roles');
  if (!getRolesChannel) { console.log('❌ #get-roles not found'); return; }

  const existing = await getRolesChannel.messages.fetch({ limit: 10 });
  const alreadyPosted = existing.some(m => m.author.id === client.user.id && m.embeds.length > 0);

  if (!alreadyPosted) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('toggle_verified').setLabel('✅ Verified Player').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('toggle_challenger').setLabel('💎 Challenger').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('toggle_member').setLabel('🎮 Member').setStyle(ButtonStyle.Secondary),
    );

    const embed = new EmbedBuilder()
      .setTitle('◈ SELECT YOUR ROLES')
      .setDescription('Click the buttons below to add or remove roles.\nClick again to remove a role.')
      .setColor(0x00c8ff)
      .addFields(
        { name: '✅ Verified Player', value: 'You have the app and are registered on The League' },
        { name: '💎 Challenger',      value: 'High-rank competitive Wild Rift player' },
        { name: '🎮 Member',          value: 'General community member' },
      )
      .setFooter({ text: '⚠️ Admin and Moderator roles are assigned by staff only' });

    await getRolesChannel.send({ embeds: [embed], components: [row] });
    console.log('✅ Role selector posted');
  } else {
    console.log('✅ Role selector already exists');
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('toggle_')) return;

  const roleKey = interaction.customId.replace('toggle_', '');
  const roleId = client.roleMap?.[roleKey];

  if (!roleId) {
    return interaction.reply({ content: '❌ Role not found. Contact staff.', ephemeral: true });
  }

  const member = interaction.member;
  const hasRole = member.roles.cache.has(roleId);

  try {
    if (hasRole) {
      await member.roles.remove(roleId);
      await interaction.reply({ content: `✅ Removed **${roleKey}** role`, ephemeral: true });
    } else {
      await member.roles.add(roleId);
      await interaction.reply({ content: `✅ You now have the **${roleKey}** role`, ephemeral: true });
    }
  } catch (e) {
    console.error('Role assign error:', e.message);
    await interaction.reply({ content: '❌ Could not assign role — contact staff.', ephemeral: true });
  }
});

client.login(TOKEN);
