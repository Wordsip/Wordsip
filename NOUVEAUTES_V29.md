# WordSip V29 — jeux plus lisibles

Version complète fondée sur V28, destinée à remplacer les fichiers du site lors de votre prochaine mise à jour. Même lancement, mêmes dépendances et mêmes paramètres. Conservez votre configuration d’environnement et votre base existante. Aucun site n’a été publié ni aucune base de production modifiée.

## La balle

La boîte est désormais représentée en perspective, avec faces transparentes, pieds, sol et balle éclairée. Les choix montrent la balle dans, sur, au-dessus, sous ou à côté de la boîte. Le contact distingue « sur » de « au-dessus ». Cliquez sur une scène puis Vérifier, ou déplacez la balle dans la grande scène à la souris, au toucher ou avec les flèches et Entrée. La traduction de la consigne reste disponible au clic.

Quatre consignes au niveau 1 ; sept aux niveaux suivants. Les choix évitent d’opposer « à côté » et « à droite/à gauche » lorsqu’un même placement pourrait légitimement correspondre aux deux. Les lecteurs d’écran disposent d’une description des scènes.

## Mission de tir

Chaque cible présente deux mots, par exemple « Famille / Family » ou une association incorrecte avec un autre mot de la famille. Visez la paire correcte. Le français et la langue étudiée alternent après un tour des mots. +10 pour une bonne cible, −5 pour une erreur.

Le menu propose les mots de la semaine, une révision variée, la famille et les thèmes de fiches : couleurs, heures, lieux, vêtements, cuisine et positions. Les pièges d’un thème proviennent du même thème ; les mots de la famille utilisent d’autres membres de la famille. Les mots changent sans répétition avant d’avoir parcouru la sélection.

« Mes mots de la semaine » réunit les mots du jour effectivement consultés et le vocabulaire des fiches consultées depuis lundi, dans la langue et le niveau actifs. Si cette sélection contient moins de quatre mots, l’écran démarre sur une révision libre, clairement indiquée. Vous pouvez revenir au choix de la semaine. Les mots d’entraînement libre et les pièges n’ajoutent aucune consultation à l’historique et ne modifient pas votre niveau.

Le thème Famille réutilise le vocabulaire existant et ajoute fille/fils au sens du lien familial dans les cinq langues. Les nuances déjà présentes pour les proches japonais et chinois sont conservées. Les cibles et le vaisseau ont une apparence en relief ; sur petit écran, les cibles utilisent deux colonnes et descendent moins vite.

## Les autres activités

Les sept activités utilisent une présentation cohérente : boutons en relief, états de sélection visibles, corrections et étapes de jeu. Associations : liaisons visibles. Intrus : repérer le thème avant de choisir. Verbes : blocs de radical/terminaison ou formulaire de rappel. Écoute : bouton audio distinct et mot caché avant la réponse.

Images : nouveaux dessins locaux pour les vêtements, les lieux et les objets de cuisine ; sphères éclairées pour les couleurs. Les consignes indiquent les deux actions : sélectionner l’étiquette, puis la placer sous l’image. Les scènes utilisent des dessins SVG en perspective et des effets de profondeur ; elles ne sont pas des modèles 3D rotatifs.

## Vérifications

Toutes les suites de tests V28 passent, avec une suite V29 supplémentaire : paires correctes et incorrectes dans les cinq langues, synonymes, absence de fausses pénalités sur les variantes connues, famille/fille/fils, alternance des langues, parcours des mots et scènes transparentes. Syntaxe JavaScript, JSON, dessins SVG et intégrité de l’archive contrôlées.

Dans un navigateur local : score d’une bonne/mauvaise paire, nouvelle question après un tir, choix de thèmes, pause ; balle par choix de scène et au clavier ; association mot/image, cartes de vêtements, liaisons, changement de langue, consigne japonaise, terminaison espagnole, écrans Intrus et Écoute. Contrôles de largeur à 390 px pour le tir et la balle, sans débordement horizontal. Aucun téléphone physique testé.

Le serveur de test utilise une base simulée. La restitution audio réelle conserve le TTS existant et reste à essayer sur votre installation ; le comportement en cas de panne et les réponses audio ont été vérifiés avec un audio simulé. Aucune nouvelle bibliothèque graphique ni aucun service externe n’a été ajouté.
