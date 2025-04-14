require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, PermissionFlagsBits } = require('discord.js');
const { ApiClient } = require('@twurple/api');
const { AppTokenAuthProvider } = require('@twurple/auth');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

const authProvider = new AppTokenAuthProvider(
    process.env.TWITCH_CLIENT_ID,
    process.env.TWITCH_CLIENT_SECRET
);

const twitchClient = new ApiClient({ authProvider });

// Chargement des streamers depuis le fichier JSON
let streamers = new Set();
try {
    if (!fs.existsSync('streamers.json')) {
        fs.writeFileSync('streamers.json', '[]');
        console.log('Création du fichier streamers.json');
    }
    const data = fs.readFileSync('streamers.json', 'utf8');
    const savedStreamers = JSON.parse(data);
    streamers = new Set(savedStreamers);
    console.log(`${streamers.size} streamers chargés depuis le fichier`);
} catch (error) {
    console.error('Erreur lors du chargement des streamers:', error);
    streamers = new Set();
}

let liveMessages = new Map();

// Fonction pour sauvegarder les streamers
function saveStreamers() {
    fs.writeFileSync('streamers.json', JSON.stringify(Array.from(streamers)));
}

// Commandes slash
const commands = [
    {
        name: 'addstreamer',
        description: 'Ajoute un streamer à la liste des notifications',
        options: [
            {
                name: 'nom',
                description: 'Le nom du streamer Twitch',
                type: 3,
                required: true
            }
        ],
        defaultMemberPermissions: '8' // Permission administrateur en string
    },
    {
        name: 'removestreamer',
        description: 'Retire un streamer de la liste des notifications',
        options: [
            {
                name: 'nom',
                description: 'Le nom du streamer Twitch',
                type: 3,
                required: true
            }
        ],
        defaultMemberPermissions: '8' // Permission administrateur en string
    },
    {
        name: 'liststreamers',
        description: 'Liste tous les streamers suivis',
        defaultMemberPermissions: '8' // Permission administrateur en string
    }
];

// Enregistrement des commandes slash
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands }
        );
        console.log('Commandes slash enregistrées avec succès !');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des commandes slash:', error);
    }
})();

client.on('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    client.user.setActivity('🎮 Dev par imo', { type: 4 });

    // Nettoyage des messages au démarrage
    try {
        const channel = await client.channels.fetch(process.env.NOTIFICATION_CHANNEL_ID);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);
            
            let deletedCount = 0;
            for (const message of botMessages.values()) {
                try {
                    await message.delete();
                    deletedCount++;
                } catch (error) {
                    console.error(`Erreur lors de la suppression du message ${message.id}:`, error);
                }
            }
            console.log(`${deletedCount} messages supprimés`);
        }
    } catch (error) {
        console.error('Erreur lors du nettoyage des messages:', error);
    }

    checkStreams();
    setInterval(checkStreams, 60000); // Vérifie toutes les minutes
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'addstreamer') {
        const streamerName = interaction.options.getString('nom').toLowerCase();
        if (streamers.has(streamerName)) {
            await interaction.reply({ content: 'Ce streamer est déjà dans la liste !', ephemeral: true });
            return;
        }
        streamers.add(streamerName);
        saveStreamers(); // Sauvegarde après l'ajout
        await interaction.reply({ content: `Streamer ${streamerName} ajouté avec succès !`, ephemeral: true });
    }

    if (interaction.commandName === 'removestreamer') {
        const streamerName = interaction.options.getString('nom').toLowerCase();
        if (!streamers.has(streamerName)) {
            await interaction.reply({ content: 'Ce streamer n\'est pas dans la liste !', ephemeral: true });
            return;
        }
        streamers.delete(streamerName);
        saveStreamers(); // Sauvegarde après la suppression
        await interaction.reply({ content: `Streamer ${streamerName} retiré avec succès !`, ephemeral: true });
    }

    if (interaction.commandName === 'liststreamers') {
        if (streamers.size === 0) {
            await interaction.reply({ content: 'Aucun streamer n\'est suivi actuellement.', ephemeral: true });
            return;
        }

        const streamersList = Array.from(streamers).map(name => `• ${name.replace(/_/g, '\\_')}`).join('\n');
        await interaction.reply({
            content: `**Liste des streamers suivis (${streamers.size}) :**\n${streamersList}`,
            ephemeral: true
        });
    }
});

async function checkStreams() {
    const channel = await client.channels.fetch(process.env.NOTIFICATION_CHANNEL_ID);
    if (!channel) return;

    // Nettoyage des messages qui n'existent plus
    for (const [streamerName, messageId] of liveMessages.entries()) {
        try {
            await channel.messages.fetch(messageId);
        } catch (error) {
            // Si le message n'existe plus, on le retire de la Map
            liveMessages.delete(streamerName);
            console.log(`Message supprimé pour ${streamerName}, nettoyage effectué`);
        }
    }

    for (const streamerName of streamers) {
        try {
            const user = await twitchClient.users.getUserByName(streamerName);
            if (!user) continue;

            const stream = await twitchClient.streams.getStreamByUserId(user.id);
            const messageId = liveMessages.get(streamerName);

            if (stream) {
                // Calcul du temps de live
                const startTime = new Date(stream.startDate);
                const now = new Date();
                const diff = now - startTime;
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const timeString = `${hours}h${minutes}m`;

                // Vérification si on doit recréer le message (toutes les 2 heures)
                const shouldRecreateMessage = hours > 0 && hours % 2 === 0 && minutes === 0;

                // Récupération des informations de la catégorie
                const category = await twitchClient.games.getGameById(stream.gameId);
                
                // Création de l'embed
                const embed = {
                    color: 0x9146FF, // Couleur Twitch
                    title: stream.title,
                    url: `https://twitch.tv/${streamerName}`,
                    author: {
                        name: `${streamerName} est en live sur Twitch !`,
                        icon_url: user.profilePictureUrl
                    },
                    image: {
                        url: `${stream.thumbnailUrl.replace('{width}', '1920').replace('{height}', '1080')}?t=${Date.now()}`
                    },
                    fields: [
                        {
                            name: '👥 Viewers',
                            value: stream.viewers.toLocaleString(),
                            inline: true
                        },
                        {
                            name: '🎮 Catégorie',
                            value: category?.name || 'Non spécifiée',
                            inline: true
                        },
                        {
                            name: '⏱️ Temps de live',
                            value: timeString,
                            inline: true
                        }
                    ],
                    timestamp: new Date()
                };

                if (messageId) {
                    try {
                        const message = await channel.messages.fetch(messageId);
                        if (shouldRecreateMessage) {
                            // Suppression de l'ancien message
                            await message.delete();
                            // Création d'un nouveau message
                            const newMessage = await channel.send({ embeds: [embed] });
                            liveMessages.set(streamerName, newMessage.id);
                            console.log(`Message recréé pour ${streamerName} après ${hours} heures de stream`);
                        } else {
                            // Mise à jour normale du message
                            await message.edit({ embeds: [embed] });
                        }
                    } catch (error) {
                        // Si le message n'existe plus, on en crée un nouveau
                        console.log(`Création d'un nouveau message pour ${streamerName}`);
                        const newMessage = await channel.send({ embeds: [embed] });
                        liveMessages.set(streamerName, newMessage.id);
                    }
                } else {
                    // Création d'un nouveau message
                    const message = await channel.send({ embeds: [embed] });
                    liveMessages.set(streamerName, message.id);
                }
            } else if (messageId) {
                try {
                    const message = await channel.messages.fetch(messageId);
                    await message.delete();
                } catch (error) {
                    console.log(`Message déjà supprimé pour ${streamerName}`);
                }
                liveMessages.delete(streamerName);
            }
        } catch (error) {
            console.error(`Erreur lors de la vérification de ${streamerName}:`, error);
        }
    }
}

client.login(process.env.DISCORD_TOKEN); 