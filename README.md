# Bot Discord de Notifications Twitch

Ce bot Discord permet de notifier automatiquement les lives Twitch dans un channel spécifique. Il envoie une notification lorsqu'un streamer commence son live et supprime automatiquement le message lorsque le live se termine.

## Prérequis

- Node.js (version 14 ou supérieure)
- Un compte Discord avec un bot
- Un compte Twitch avec une application API
- Les permissions administrateur sur le serveur Discord

## Installation

1. Clonez ce dépôt :
```bash
git clone https://github.com/ImoriSama/MultiNotifications-Twitch-Discord.git
cd Twitch-Notif-Bot
```

2. Installez les dépendances :
```bash
npm install
```

3. Copiez le fichier `.env.exemple` en `.env` :
```bash
cp .env.exemple .env
```

4. Configurez le fichier `.env` avec vos informations :
- `DISCORD_TOKEN` : Le token de votre bot Discord
- `DISCORD_CLIENT_ID` : L'ID client de votre application Discord
- `TWITCH_CLIENT_ID` : L'ID client de votre application Twitch
- `TWITCH_CLIENT_SECRET` : Le secret client de votre application Twitch
- `NOTIFICATION_CHANNEL_ID` : L'ID du channel Discord où les notifications seront envoyées
- `CHECK_INTERVAL` : L'intervalle de vérification des lives (en millisecondes, par défaut 60000)

## Configuration

### Configuration Discord
1. Créez une application Discord sur le [Portail des développeurs Discord](https://discord.com/developers/applications)
2. Créez un bot pour votre application
3. Copiez le token du bot et l'ID client
4. Invitez le bot sur votre serveur avec les permissions nécessaires

### Configuration Twitch
1. Créez une application Twitch sur le [Portail des développeurs Twitch](https://dev.twitch.tv/console)
2. Notez l'ID client et le secret client
3. Configurez l'URL de redirection ("http://localhost" à mettre par défaut)

## Utilisation

1. Démarrez le bot :
```bash
npm start
```

2. Commandes disponibles :
- `/addstreamer [nom]` - Ajoute un streamer à la liste des notifications
- `/removestreamer [nom]` - Retire un streamer de la liste des notifications
- `/liststreamers` - Liste tous les streamers suivis

## Fonctionnalités

- Notifications automatiques lors du démarrage d'un live
- Suppression automatique des messages lorsque le live se termine
- Commandes slash pour gérer la liste des streamers
- Vérification des lives à intervalle régulier
- Mise à jour automatique des miniatures de live à intervalle régulier
- Interface simple et intuitive

## Support

Si vous rencontrez des problèmes ou avez des questions, n'hésitez pas à :
- Ouvrir une issue sur GitHub
- Consulter la documentation de [Discord.js](https://discord.js.org/#/)
- Consulter la documentation de l'[API Twitch](https://dev.twitch.tv/docs/api/)

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails. 