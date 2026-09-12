# WordSip 🌍

Un mot par jour, envoyé par email/WhatsApp/site, avec exercices et vidéos hebdomadaires.

## Fonctionnalités

- Inscription en 2 étapes : infos de base puis toutes les préférences (fréquence, canal, heure, mode d'exercice)
- 5 langues : anglais, espagnol, italien, japonais, chinois
- 3 niveaux fixes, choisis à l'inscription : Niveau 1 (Collège, 6e-5e-4e), Niveau 2 (Lycée, 3e-2nde-1re-Tle), Niveau 3 (Fac / Master / Pro)
- Barre de progression par niveau (% de mots distincts validés / total disponible), affichée sur la page du mot du jour pour suivre son avancement
- Chaque mot inclut : phonétique (anglais : US et UK), 2 exemples, grammaire détaillée (nature/position/registre/synonymes), argot
- Exercice d'écriture interactif : le mot disparaît (bouton manuel ou minuteur au choix), 4 tentatives avec correction
- Mode essai invité, 7 jours, sans inscription
- Canal "sur le site uniquement" pour ceux qui ne veulent pas de notification
- Heure d'envoi personnalisée par utilisateur (vérifiée toutes les 15 min)
- Publication automatique d'un tweet quotidien à 9h (heure de meilleure activité en France)
- Vidéo hebdomadaire (dimanche 18h) : dialogue de 2 répliques en bulles de texte + voix de synthèse gratuite, avec quiz "quel mot as-tu reconnu"

## Déploiement sur Render

1. Va sur [render.com](https://render.com) et connecte-toi avec ton compte GitHub
2. Clique sur **New Web Service**, sélectionne le dépôt `wordsip`
3. Render détecte automatiquement Node.js — laisse les réglages par défaut
4. Dans l'onglet **Environment**, ajoute les variables suivantes :
   - `SENDGRID_API_KEY`, `SENDER_EMAIL`, `CONTACT_EMAIL` (email)
   - `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET` (tweet auto)
5. Clique sur **Deploy**

Sans les clés configurées, le site fonctionne quand même : emails et tweets sont simulés dans les logs.

## Développement local

```bash
npm install
cp .env.example .env
npm start
```

Le site sera accessible sur `http://localhost:3000`.

## Structure du projet

```
wordsip/
├── server.js
├── routes/index.js
├── services/
│   ├── userService.js       # Utilisateurs + progression
│   ├── wordService.js       # Sélection du mot selon sous-niveau
│   ├── emailService.js      # Envoi email (SendGrid)
│   ├── twitterService.js    # Publication tweet auto
│   ├── dialogueService.js   # Génération du dialogue hebdomadaire
│   └── videoService.js      # Génération vidéo (bulles + TTS + ffmpeg)
├── cron/
│   ├── dailySender.js       # Emails par créneau + tweet 9h
│   └── weeklyVideo.js       # Vidéo dimanche 18h
├── data/
│   └── words.seed.json      # Base de mots de départ (anglais : 84 mots ; autres langues : 40/langue, à enrichir)
└── public/
    ├── index.html           # Accueil (inscription 2 étapes + essai invité)
    ├── mot-du-jour.html     # Tableau de bord + exercice
    └── video-semaine.html   # Vidéo + quiz
```

## Sécurité

- Le secret admin (`ADMIN_SECRET`) est envoyé via le header `x-admin-secret`, jamais dans l'URL, pour éviter qu'il se retrouve dans les logs serveur/proxy ou l'historique du navigateur.
- La route `/api/tts` (relais audio) est limitée à 20 requêtes/minute par IP et 200 caractères par texte, pour éviter qu'elle serve de proxy gratuit vers l'API TTS de Google.

## Notes techniques importantes

- La génération vidéo utilise `ffmpeg-static` (binaire embarqué, pas d'install système requise) et `sharp` pour dessiner les bulles de texte en SVG. Le TTS utilise l'API gratuite non-officielle de Google Translate.
- Le générateur vidéo n'a pas pu être testé de bout en bout en environnement de développement (accès réseau restreint pour le téléchargement audio) — seule la partie image + assemblage ffmpeg a été validée. À tester en priorité une fois déployé sur Render.

## Prochaines étapes prévues

- Compléter la base de mots pour espagnol/italien/japonais/chinois (actuellement 40 mots/langue, niveau 3 vide) — l'anglais sert de modèle avec 84 mots répartis sur les 3 niveaux
- Historique des mots appris
- Applications mobiles iOS/Android
- Palier payant après 1 mois gratuit
