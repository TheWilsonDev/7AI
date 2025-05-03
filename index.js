require("dotenv").config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ChannelType } = require("discord.js");
const { io } = require("socket.io-client"); // Import socket.io-client

// Create a new client instance with necessary intents
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember], // Required for guildMemberAdd event
});

const MEMBER_ROLE_NAME = "3.5";
const WELCOME_CHANNEL_NAME = "general"; // Define the welcome channel name
const TRADES_CHANNEL_NAME = "trades"; // Define the trades channel name
const SOCKET_SERVER_URL = "http://localhost:3001"; // Define the Socket.IO server URL

// Keep track of recent transaction signatures to avoid duplicates
const RECENT_SIGNATURES_MAX_SIZE = 100; // Store the last 100 signatures
const recentSignatures = new Set();

// --- Command Registry ---
const commandsRegistry = [];

// Sample Command Functions (can be defined anywhere before registration)
function ping() {
  console.log("Executing: ping");
  // In a real scenario, this might calculate actual bot latency
  return { reply: "Pong!" };
}

function testRelay(args) {
  // Added args placeholder for future use
  console.log("Executing: testRelay with args:", args);
  // Simulate some action
  return { status: "success", message: "Test relay received and processed!", details: args };
}

// Register Commands
commandsRegistry.push({
  name: "ping",
  description: "Check if the bot is responsive.",
  execute: ping, // Reference to the function
});

commandsRegistry.push({
  name: "testRelay",
  description: "Sends a test signal for relay confirmation.",
  execute: testRelay, // Reference to the function
});
// Add more commands here by defining a function and pushing an object
// --- End Command Registry ---

// When the client is ready, run this code (only once)
client.once("ready", async () => {
  console.log(`7evn.ai is online as ${client.user.tag}`);

  // --- Log Channel Structure ---
  console.log("\n--- Server Channel Structure ---");
  client.guilds.cache.forEach((guild) => {
    console.log(`\nGuild: ${guild.name} (${guild.id})`);

    console.log("  Text Channels:");
    guild.channels.cache
      .filter((channel) => channel.type === ChannelType.GuildText)
      .sort((a, b) => a.position - b.position) // Sort by position
      .forEach((channel) => {
        console.log(`    - ${channel.name} (${channel.id})`);
      });

    console.log("\n  Voice Channels:");
    guild.channels.cache
      .filter((channel) => channel.type === ChannelType.GuildVoice)
      .sort((a, b) => a.position - b.position) // Sort by position
      .forEach((channel) => {
        console.log(`    - ${channel.name} (${channel.id})`);
      });
  });
  console.log("\n------------------------------\n");
  // --- End Log Channel Structure ---

  // --- Send Consolidated Welcome Embed ---
  try {
    const welcomeChannelId = "1367979153558868028";
    const channel = await client.channels.fetch(welcomeChannelId);
    const embedColor = "#9C6BFF"; // Gradient-style purple
    const embedTitle = "Welcome to 7evn.gg - Your Guide"; // Unique title for the consolidated embed

    if (channel && channel.type === ChannelType.GuildText) {
      // Check if the consolidated embed already exists
      const messages = await channel.messages.fetch({ limit: 10 });
      const existingEmbed = messages.find(
        (msg) => msg.author.id === client.user.id && msg.embeds.length > 0 && msg.embeds[0].title === embedTitle // Check for the new title
      );

      if (!existingEmbed) {
        console.log(`Sending consolidated welcome embed to channel ID ${welcomeChannelId}`);

        const consolidatedEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(embedTitle)
          .setDescription(
            `Welcome to **7evn.gg**, a hub of premium AI-powered tools, whale tracking, and community resources.\n` +
              `Whether you're here to explore public tools or access our exclusive private network, this guide covers everything.\n` +
              `Stay locked in 🧠\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n\n` +
              `**🧵 Main Channels**\n` +
              `Here's where most discussion and info happens:\n` +
              `💬 <#1362250641862426656> – Talk about anything, anytime\n` +
              `📣 <#1362251729558704388> – AI-powered drops, insights, and system announcements\n` +
              `🧠 <#1367971192283336735> – Live tracking of whale wallet movements\n` +
              `🧪 <#1367971126239826032> – All things GitHub: commits, releases, experiments\n` +
              `🌐 <#1367971528700067930> – A vault of free resources and open servers\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n\n` +
              `**🔒 Private Network**\n` +
              `Our **7UP** members get access to the elite tier:\n` +
              `📁 <#1367971267696660490> – Premium servers, tools, and resources\n` +
              `🧠 Curated content, early drops, and deeper AI workflows\n\n` +
              `**To gain access:**\n` +
              `➡️ Visit <#1367972192611995698> to upgrade and become a **7UP** member.\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n\n` +
              `**🧠 Voice Channels**\n` +
              `Connect with others live:\n` +
              `🧠 \`gen\` – General chill or collab room\n` +
              `🧪 \`7evn\` – Private voice room for 7UP collabs and ops\n` +
              `Hop in during team drops or while experimenting with tools.\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n\n` +
              `**📘 Full Guide + Support**\n` +
              `This channel (<#${welcomeChannelId}>) is your home base. Revisit anytime.\n\n` +
              `**Need help or want to unlock the network?**\n` +
              `Upgrade here: <#1367972192611995698>\n` +
              `DM 7evn.ai or open a ticket if stuck.\n\n` +
              `Welcome to 7evn.gg. Let's build.`
          )
          .setFooter({ text: "7ven.gg • AI-powered community access" });

        await channel.send({ embeds: [consolidatedEmbed] });
        console.log(`Successfully sent consolidated welcome embed to channel ID ${welcomeChannelId}`);
      } else {
        console.log(`Consolidated welcome embed already exists in channel ID ${welcomeChannelId}. Skipping.`);
      }
    } else {
      console.warn(`Could not find text channel with ID ${welcomeChannelId} or it's not a text channel.`);
    }
  } catch (error) {
    console.error(`Failed to send consolidated welcome embed:`, error);
  }
  // --- End Send Consolidated Welcome Embed ---

  // --- Send Locked Channel Embed ---
  try {
    const targetChannelId = "1367971267696660490";
    const channel = await client.channels.fetch(targetChannelId);

    if (channel && channel.type === ChannelType.GuildText) {
      // Check if the embed already exists
      const messages = await channel.messages.fetch({ limit: 10 }); // Fetch last 10 messages
      const existingEmbed = messages.find(
        (msg) =>
          msg.author.id === client.user.id && // Check if bot sent the message
          msg.embeds.length > 0 && // Check if there are embeds
          msg.embeds[0].title === "🔒 Private Network Access" // Check embed title
      );

      if (!existingEmbed) {
        // Only send if the embed doesn't exist
        const lockEmbed = new EmbedBuilder()
          .setColor("#F47FFF") // Sleek pink/purple
          .setTitle("Private Network Access")
          .setDescription(
            `This channel is locked. Access is granted only to members with the <@&1367970928415477880> role.\n\n` + // Double line break
              `🔓 **Unlock Access:** Visit <#1367972192611995698> to get the **7UP** role and gain entry.`
          )
          .setFooter({ text: "7ven.gg Access System" })
          .setTimestamp(); // Add timestamp

        await channel.send({ embeds: [lockEmbed] });
        console.log(`Sent lock embed to channel ID ${targetChannelId}`);
      } else {
        console.log(`Lock embed already exists in channel ID ${targetChannelId}. Skipping.`);
      }
    } else {
      console.warn(`Could not find text channel with ID ${targetChannelId} or it's not a text channel.`);
    }
  } catch (error) {
    console.error(`Failed to send lock embed:`, error);
  }
  // --- End Send Locked Channel Embed ---

  // --- Connect to Socket.IO Server ---
  console.log(`Attempting to connect to Socket.IO server at ${SOCKET_SERVER_URL}`);
  const socket = io(SOCKET_SERVER_URL);

  socket.on("connect", () => {
    console.log(`Successfully connected to Socket.IO server: ${socket.id}`);
  });

  socket.on("disconnect", (reason) => {
    console.warn(`Disconnected from Socket.IO server: ${reason}`);
    // Optional: Add reconnection logic here if needed
  });

  socket.on("connect_error", (error) => {
    console.error(`Socket.IO connection error: ${error.message}`);
  });

  // --- Listen for Solana Transactions ---
  socket.on("solana_transaction", (payload) => {
    console.log("Received solana_transaction event:", payload); // Log received data

    try {
      const { walletAddress, signature, type, amount, timestamp } = payload;

      // Basic validation
      if (!walletAddress || !signature || !type || !amount || !timestamp) {
        console.warn("Received incomplete transaction payload:", payload);
        return;
      }

      // Avoid duplicate processing
      if (recentSignatures.has(signature)) {
        console.log(`Skipping duplicate transaction: ${signature}`);
        return;
      }
      recentSignatures.add(signature);
      // Keep the set size manageable
      if (recentSignatures.size > RECENT_SIGNATURES_MAX_SIZE) {
        const oldestSignature = recentSignatures.values().next().value;
        recentSignatures.delete(oldestSignature);
      }

      // Format timestamp (HH:MM AM/PM)
      const localTime = new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Construct Solana Explorer Link
      const explorerLink = `https://solscan.io/tx/${signature}`;

      // Format the message
      const message = `📈 New Transaction Detected\n` + `Wallet: \`${walletAddress}\`\n` + `Type: \`${type}\`\n` + `Amount: \`${amount}\`\n` + `Time: ${localTime}\n`;

      // Send the message to the trades channel
      const tradesChannel = client.channels.cache.find((channel) => channel.name === TRADES_CHANNEL_NAME && channel.type === ChannelType.GuildText);

      if (tradesChannel) {
        tradesChannel.send(message);
        console.log(`Sent transaction message to #${TRADES_CHANNEL_NAME}`);
      } else {
        console.warn(`Trades channel '#${TRADES_CHANNEL_NAME}' not found.`);
      }
    } catch (error) {
      console.error("Error processing solana_transaction event:", error);
      console.error("Original payload:", payload);
    }
  });
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

// --- Status Server ---
const express = require("express");
const statusApp = express();
const STATUS_PORT = 3000;

// Middleware to parse JSON request bodies
statusApp.use(express.json());

statusApp.get("/status", (req, res) => {
  console.log("Received request at /status"); // Log the request
  // Check if client and client.user are available before accessing tag
  const botTag = client && client.user ? client.user.tag : "initializing";
  res.json({
    status: client?.isReady() ? "online" : "initializing", // Use isReady() for accurate status
    botTag: botTag,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint to list commands
statusApp.get("/commands", (req, res) => {
  console.log("Received request at /commands");
  // Important: Only send name and description, not the execute function
  const commandList = commandsRegistry.map(({ name, description }) => ({ name, description }));
  res.json(commandList);
});

// Endpoint to execute commands
statusApp.post("/execute-command", (req, res) => {
  const { commandName, args } = req.body; // Extract command name and optional args from body
  console.log(`Received request to execute command: ${commandName} with args:`, args);

  const command = commandsRegistry.find((cmd) => cmd.name === commandName);

  if (command && typeof command.execute === "function") {
    try {
      const result = command.execute(args); // Execute the function, passing args
      console.log(`Command ${commandName} executed successfully. Result:`, result);
      res.json({ success: true, result: result });
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      res.status(500).json({ success: false, message: "Error executing command.", error: error.message });
    }
  } else {
    console.warn(`Command not found or invalid: ${commandName}`);
    res.status(404).json({ success: false, message: `Command '${commandName}' not found.` });
  }
});

statusApp.listen(STATUS_PORT, () => {
  console.log(`Status server running at http://localhost:${STATUS_PORT}/status`);
});
