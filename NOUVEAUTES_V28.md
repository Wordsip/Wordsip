# WordSip V28 — fiches et jeux dans le parcours

## Où commencer

Ouvrir « Fiches de cours », puis Vocabulaire. Les six étapes proposent Couleurs, Heures, Lieux, Positions, Vêtements et Cuisine. Chaque thème existe en anglais, espagnol, italien, japonais et chinois : 30 fiches au total (la fiche anglaise Couleurs est remplacée et enrichie).

Chaque fiche contient un objectif, les prérequis, 7 à 8 mots, deux exemples, un point de langue, trois questions corrigées, une petite tâche personnelle et une proposition de révision espacée. Les traductions des mots restent consultables au clic. Japonais : lecture en romaji ; chinois : pinyin. La version imprimable affiche aussi le français. Les phrases personnelles ne sont pas corrigées automatiquement et ne sont pas envoyées au serveur.

## Catégorie Jeux

- Mots à relier : sélectionner un mot puis sa traduction, avec liaison visible.
- Où va la balle ? : déplacer la balle selon une consigne dans la langue choisie. Souris, toucher, emplacements cliquables et clavier disponibles. « Sur » implique le contact ; « au-dessus » ne l’implique pas.
- Le mot intrus : retrouver le mot appartenant à un autre thème.
- L’atelier des verbes : irréguliers anglais, présent espagnol et italien, deux verbes irréguliers japonais à la forme polie. Le chinois n’a pas de conjugaisons équivalentes ; le jeu l’explique et propose les autres activités.
- Images et mots : sélectionner un mot puis le placer sous son illustration. Les couleurs, lieux, vêtements et objets de cuisine utilisent des dessins SVG ou pictogrammes. Placement par clic/toucher, pas par glisser-déposer des étiquettes.
- Écouter et écrire : écouter sans voir le mot, écrire sa transcription puis vérifier. Réécoute possible. Au niveau 1, romaji/pinyin indiqués dans la fiche sont aussi acceptés ; aux niveaux suivants, l’écriture étudiée est attendue. Les accents comptent. Sans lecture audio, aucune réponse ne compte et aucune pénalité n’est appliquée.
- Mission de la semaine : jeu de tir de V27, sur les mots du jour effectivement consultés depuis lundi.

Bonne réponse : +10 ; erreur : −5. Les corrections donnent la réponse et son sens. Les scores ne valident pas les mots du jour et ne modifient pas le niveau du compte.

## Parcours de la semaine

Consulter une fiche puis cliquer « Continuer dans les jeux de mon parcours ». Le panneau de la semaine propose les activités liées aux fiches consultées depuis lundi, dans la langue et le niveau actifs. Les positions débloquent la balle ; les fiches de conjugaison débloquent les verbes ; le vocabulaire débloque associations, écoute et, selon le thème, images. Le mot intrus nécessite deux thèmes étudiés. Les jeux restent disponibles séparément en accès libre.

La difficulté utilise 4, 6 ou 8 mots selon le niveau et des consignes de position progressivement élargies. Espagnol/italien : terminaisons régulières au niveau 1, formes irrégulières aux niveaux suivants. Les fiches du quotidien sont débutantes et les jeux servent de révision aux niveaux supérieurs.

« Consultée » ne signifie pas « maîtrisée » ou « validée ». Le suivi daté commence avec V28 : les anciennes consultations ne peuvent pas être reconstruites. Pour les comptes : lessonHistory en base, 1000 entrées maximum, sans modifier les anciennes fiches en base. En invité : suivi dans le navigateur, séparé par langue/niveau, limité à 90 jours/1000 entrées. Une consultation directe de la page d’impression n’alimente pas le parcours ; ouvrir la fiche depuis Fiches de cours.

## Installation

Archive complète fondée sur V27/V26. Même lancement et mêmes paramètres. Aucune dépendance ajoutée. Les ajouts et corrections de fiches sont fusionnés lors de la lecture : aucune réinitialisation de MongoDB nécessaire et les fiches personnalisées sont conservées. Conserver les variables d’environnement et la base de l’installation existante. Le site n’a pas été publié.

## Vérifications

`npm test` : 30 fiches, 90 QCM, cinq langues, corrections ciblées, conservation des fiches personnalisées, conjugaisons et accents, positions non ambiguës, parcours selon consultations réelles et niveau, suivi daté mots/fiches, anciens comptes, dédoublonnage et progression conservée. Test du jeu audio avec audio simulé : mot caché, bonne/mauvaise réponse, panne, événements périmés, lecture préalable et écritures acceptées.

Tests navigateur local : fiche Heures et exercice, parcours invité après consultation ; associations, balle, intrus, verbes anglais/espagnol/italien, placement sous image, consigne japonaise, changement de langue et liens. Le jeu audio masque le mot et gère l’échec de lecture. Toutes les syntaxes JavaScript et l’archive sont contrôlées. La base de production n’a pas été contactée ; les routes de compte utilisent une base simulée. Aucun test sur téléphone physique.

L’audio conserve le service TTS existant et dépend de sa connexion à Google. La restitution sonore réelle n’a pas pu être validée dans le serveur local de test ; elle reste à essayer sur votre installation. Aucune reconnaissance vocale ni accès au microphone n’est nécessaire.
