require("dotenv").config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");

// Create a new client instance with necessary intents
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember], // Required for guildMemberAdd event
});

const MEMBER_ROLE_NAME = "3.5";
const WELCOME_CHANNEL_NAME = "general"; // Define the welcome channel name

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log(`7evn.ai is online as ${client.user.tag}`);
});

// When a new member joins a guild
client.on("guildMemberAdd", async (member) => {
  console.log(`New member joined: ${member.user.tag} in ${member.guild.name}`);

  // --- Send Welcome Embed ---
  const welcomeChannel = member.guild.channels.cache.find(
    (channel) => channel.name === WELCOME_CHANNEL_NAME && channel.type === 0 // 0 = GUILD_TEXT
  );

  if (welcomeChannel) {
    const welcomeEmbed = new EmbedBuilder()
      .setColor("#0099ff") // You can customize the color
      .setTitle(`Welcome to ${member.guild.name}!`)
      .setDescription(`Welcome <@${member.id}>! We're glad to have you here.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true })) // User's avatar
      .setTimestamp(); // Adds a timestamp

    try {
      await welcomeChannel.send({ embeds: [welcomeEmbed] });
      console.log(`Sent welcome message for ${member.user.tag} to #${WELCOME_CHANNEL_NAME}`);
    } catch (error) {
      console.error(`Failed to send welcome message to #${WELCOME_CHANNEL_NAME}:`, error);
    }
  } else {
    console.warn(`Welcome channel '#${WELCOME_CHANNEL_NAME}' not found in guild ${member.guild.name}.`);
  }

  // --- Assign Role (existing logic) ---
  try {
    // Find the role named MEMBER_ROLE_NAME (e.g., 'Member')
    const role = member.guild.roles.cache.find((r) => r.name === MEMBER_ROLE_NAME);

    if (!role) {
      // Adjusted log message slightly
      console.warn(`Role '${MEMBER_ROLE_NAME}' for auto-assignment not found in guild ${member.guild.name}.`);
      // No return here, we still want to try sending the welcome message even if role assignment fails/role not found
    } else {
      // Add the role to the member
      await member.roles.add(role);
      console.log(`Assigned role '${MEMBER_ROLE_NAME}' to ${member.user.tag}`);
    }
  } catch (error) {
    console.error(`Failed to assign role '${MEMBER_ROLE_NAME}' to ${member.user.tag}:`, error);
  }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
