# WordSip V27 — aide au clic et mission vocabulaire

## Utilisation

- Les mots avec un soulignement pointillé sont cliquables : une petite fenêtre affiche leur traduction française et une explication courte. Fermer ou Échap permet de revenir à la fiche. Entrée/Espace fonctionne au clavier.
- L’aide couvre l’anglais, l’espagnol, l’italien, le japonais et le chinois : fiches existantes, exemples du mot du jour, grammaire, verbes, caractères, histoires et correction de dictée. Les boutons de réponse aux exercices restent des boutons de réponse.
- Le glossaire contient les mots de départ du site, les termes des fiches et des mots courants supplémentaires. Seuls les termes disposant d’une traduction sont rendus cliquables ; ce n’est pas un traducteur de phrases libres. Le mot du jour ajoute aussi sa traduction réelle chargée depuis la base.
- Les aides françaises des cartes de fiches sont masquées à l’écran et consultables au clic. Elles restent présentes à l’impression. Les traductions pédagogiques déjà affichées dans les autres tableaux sont conservées.
- Un lien « Jeu de la semaine » ouvre /jeu-semaine. Consulter son mot du jour avant de jouer.

## Jeu

Mission avec vaisseau, projectiles et cibles mobiles. Le mot à traduire apparaît au-dessus : tirer sur la bonne traduction, puis retrouver le mot étranger depuis sa traduction française. Chaque mot passe dans les deux sens.

Flèches ou A/D : déplacer ; Espace : tirer. À la souris ou au doigt, toucher sous la cible pour viser et tirer. Des boutons de déplacement et de tir ainsi qu’une sélection accessible au clavier sont disponibles.

Partie de 90 secondes avec 3 vies. Bonne cible : +10 points ; mauvaise cible : −5 points. Une bonne cible qui s’échappe coûte une vie. Pause arrête le temps et les cibles ; quitter la fenêtre met automatiquement en pause. Une partie ne valide pas les mots et ne modifie pas la progression scolaire.

Le jeu utilise uniquement les mots du jour effectivement consultés depuis lundi, dans la langue et le niveau actifs. Il n’ajoute ni les jours futurs ni toute la banque de vocabulaire. Le suivi daté commence avec V27 : les anciennes validations sans date ne permettent pas de reconstruire une semaine fiable.

Pour un compte, les consultations sont enregistrées en base dans wordHistory (1000 entrées maximum). En mode invité, elles restent dans ce navigateur, séparées par langue et niveau ; stockage limité à 90 jours/1000 entrées. Sans mot enregistré, le jeu invite à consulter le mot du jour.

## Installation et limites

Archive complète du projet, basée sur V26. Même lancement et mêmes paramètres que V26, avec les fichiers supplémentaires présents dans cette archive. Aucune dépendance ajoutée. Pour un déploiement existant, sauvegarder sa configuration et sa base avant de remplacer les fichiers applicatifs ; ne pas remplacer les variables d’environnement.

Les fiches de grammaire japonaises/chinoises absentes de V26 n’ont pas été inventées : l’aide fonctionne sur les mots, exemples et caractères déjà disponibles dans ces langues.

Le site n’a pas été publié. La base MongoDB et les services de production n’ont pas été contactés pour les tests. Les routes ont été exercées sur un serveur local avec une base simulée. La lecture audio conserve le service existant ; la production audio n’a pas été vérifiée dans cet environnement local.

## Vérifications réalisées

Tests automatisés : sélection hebdomadaire, semaine à cheval sur deux années, exclusions des consultations anciennes/futures, langue/niveau, dédoublonnage, deux sens pour chaque mot, bonnes/mauvaises réponses, traductions synonymes, cinq glossaires, enregistrement daté, anciens comptes et conservation de la progression (base simulée).

Tests navigateur local : aides au clic anglais/espagnol/italien/japonais/chinois, fiche de grammaire, caractère japonais, définition fermée par défaut, exercice conservé, jeu avec quatre mots, score −5 puis +10, pause et jeu invité chinois reprenant le mot consulté. Présentation du jeu inspectée à la taille normale du navigateur ; commandes mobiles présentes, sans test sur un téléphone physique.

Tests des routes sur serveur local : utilisateur absent, langue inconnue, refus d’un mot hors banque, traduction fournie par le serveur et dédoublonnage des mots de la semaine.

Pour relancer les tests autonomes : npm test. Ils fonctionnent sans connexion à la base.
