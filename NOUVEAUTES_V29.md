# WordSip V29 — Jeux relookés, plus fluides et plus difficiles

## Sécurité et dépôt GitHub
- `package-lock.json` mis à jour : express 4.22.3, body-parser 1.20.8, qs 6.16.0, proxy-addr 2.0.8, sharp 0.35.5 → `npm audit` = 0 vulnérabilité (le code n'a pas changé).
- `.gitignore` ajouté (`node_modules/`, `.env`, journaux) pour ne jamais publier de secrets ni de dépendances.

## Nouveau look « arcade » (inspiré de Poki)
- Page `/jeux` : grandes tuiles colorées avec animation au survol, étoiles de difficulté, **record personnel par jeu** (🏅), bouton son.
- Barre de jeu : score, **combo 🔥**, **vies ❤️**, **chrono** qui se vide, points de progression, boutons « 3D ».
- Écran de résultat : étoiles animées, statistiques (bonnes réponses, meilleur combo, précision), confettis, « Nouveau record ! ».
- Sons synthétisés (aucun fichier audio), vibration sur mobile, bouton muet mémorisé. Animations réduites automatiquement si le système le demande.

## Nouveau jeu : Parking des phrases 🅿️
Inspiré du puzzle « Car Parking Jam » : on fait **glisser les voitures le long de leur voie** (souris, doigt ou flèches du clavier).
- Chaque niveau propose une **phrase à construire** (tirée des phrases d'exemple des fiches, en français). Les voitures portent les **mots de la phrase** ; il faut les faire sortir **dans l'ordre**, en poussant la voiture au-delà du bord quand sa voie est libre.
- **Intrus** : des voitures portent des mots qui ne font pas partie de la phrase. **Obstacles** : plots et barrières immobiles qui bloquent les voies. Sortir un intrus ou un mot dans le mauvais ordre coûte −5 points et une vie.
- 3 phrases par partie ; plus de mots, d'intrus et d'obstacles aux niveaux avancés. Le japonais et le chinois sont découpés en mots automatiquement.
- Plateaux 6×6 générés au hasard et **garantis faisables** par un solveur ; **+5 points** pour des coups optimaux ; chrono par phrase, vies, combo, records.
- Boutons **💡 Indice** (−3 points) et **🔊 Écouter** la phrase.
- Fichiers : `public/parking-core.js` (moteur et solveur), `tests/parking.test.cjs`.

## Nouveau jeu : Billard des mots 🎱
Une vraie table de billard (physique 2D : rebonds sur les bandes, chocs entre billes, frottements, poches) pour apprendre en jouant.
- Chaque bille porte un **mot** ; les **6 poches** portent des **traductions**. Il faut envoyer la bille du mot demandé dans la poche qui porte sa traduction (dans les manches impaires, c'est l'inverse : bille en français, poches dans la langue étudiée).
- **Intrus** : les autres billes ne sont pas la cible ; en empocher une coûte −5 points et une vie. Envoyer la bonne bille dans la mauvaise poche coûte aussi une vie, et la bonne poche est révélée.
- **Obstacles** : des plots font rebondir les billes. **Difficulté** : 5/4/3 tirs par manche selon le niveau, chrono, davantage d'intrus et de plots au fil des 6 manches.
- **Visée** : on recule à la souris ou au doigt (comme une fronde) ; plus on recule, plus le tir est fort. Au clavier : flèches pour viser et régler la puissance, Entrée pour tirer.
- Chaque manche est **garantie réalisable** (le moteur calcule un tir qui marche) ; bouton **💡 Indice** (−3) qui règle la visée ; **+5** si la bonne bille est empochée du premier coup ; la phrase d'exemple du mot s'affiche après une bonne réponse.
- Fichiers : `public/billiard-core.js` (moteur physique), `tests/billiard.test.cjs`.

## Fiches de cours : une vraie bibliothèque (page Grammaire → onglet « Fiches de cours »)
- **Tuiles colorées** (comme les jeux) : une carte par fiche, avec icône, titre, résumé, type (Vocabulaire, Règle, Temps, Référence), étape du parcours et pastille « ✓ vue » pour les fiches déjà ouvertes (mémorisée sur l'appareil).
- **Classement de A à Z** : les fiches sont rangées par lettre, avec une grande pastille de lettre qui reste visible pendant le défilement. Les articles en tête de titre sont ignorés (« Los artículos » est sous A, « La voix passive » sous V). Boutons **A → Z**, **Z → A** et **Parcours** (étapes du quotidien, vocabulaire, grammaire).
- **Index A–Z qui défile** : une colonne de lettres à droite (bande horizontale collante sur mobile). Un clic fait défiler jusqu'à la lettre ; la lettre en cours est surlignée ; les lettres sans fiche sont grisées.
- **Barre latérale à gauche**, toujours visible, même quand une fiche est ouverte : recherche, filtres avec compteurs (Toutes, Parcours, Vocabulaire, Grammaire) et liste de toutes les fiches pour passer de l'une à l'autre en un clic. Sur mobile, elle devient un bandeau au-dessus des tuiles.
- **Recherche intelligente** : dans les titres, les résumés **et les mots des fiches** (taper « rouge » trouve la fiche Couleurs, avec la note « Contient « red » = rouge »). Insensible aux accents et aux majuscules ; plusieurs mots possibles ; touche `/` pour chercher, `Échap` pour effacer.
- Les liens directs (`?lesson=…`), le suivi des fiches consultées et les onglets Verbes irréguliers et Caractères fonctionnent comme avant.
- Fichiers : `public/fiches-library.js`, `public/fiches-library.css` ; `public/grammaire.html` et `public/grammaire.js` adaptés ; `tests/library.test.cjs`.

## Navigation
- Dans un jeu, une **barre latérale à gauche** liste tous les jeux et la mission de la semaine : on change de jeu en un clic, sans revenir à l'accueil. Le jeu en cours est surligné et le bouton « Tous les jeux » ramène aux tuiles. Sur mobile, la barre devient une bande horizontale défilante en haut.

## Mission vocabulaire : robots de l'espace, mots variés, intrus et obstacles
- **Fini le même mot en boucle** : chaque mot sort une seule fois avant que le paquet soit refait. Les mots consultés cette semaine passent en premier, **complétés par les mots des fiches** (même avec un seul mot consulté, la partie reste variée). Sans mot consulté, une mission de découverte est proposée.
- Les cibles sont des **robots de l'espace** qui portent un mot sur leur écran. Un seul robot porte la bonne réponse, les autres sont des **intrus** (mots proches du même thème en priorité).
- **Obstacles** : des astéroïdes arrêtent vos tirs (dès la vague 2), des mines explosent si vous les touchez : −5 et une vie (dès la vague 5).
- **Apprentissage** : après une bonne réponse, la phrase d'exemple du mot s'affiche ; le bilan de fin liste les mots réussis.
- Difficulté croissante : plus d'intrus, de vitesse, de balancement et d'obstacles à chaque vague.
- Fichiers : `public/week-game-core.js` (paquet de mots), `public/jeu-semaine.js`, `tests/week-deck.test.cjs`.

## Fluidité
- Glisser-déposer réel (souris et tactile) pour la balle et pour « Images et mots », avec clic/clavier toujours possibles.
- Lignes qui se dessinent, rebonds, secousses sur erreur, textes flottants « +10 », vague sonore pendant l'écoute.
- Mission de la semaine : canvas net sur écrans Retina, décor spatial, vaisseau animé, explosions, secousses d'écran.

## Difficulté
- **Vies** : 5 (niveau 1), 4 (niveau 2), 3 (niveau 3). Une erreur ou un temps écoulé coûte une vie.
- **Chrono** par manche, plus court aux niveaux avancés (×1,4 / ×1 / ×0,78).
- **Combo** : à partir de 3 bonnes réponses d'affilée, points bonus (+2, +4… jusqu'à +10).
- Plus de manches : intrus 5 → 8, mots à relier et images en 2 plateaux, écoute jusqu'à 8 mots, images à 4 par tableau.
- Mission de la semaine : cibles de plus en plus rapides et plus larges dans leur balancement à chaque vague, vitesses individuelles, +1,5 s par bonne cible (plafond 120 s).

## Inchangé
- Les 6 jeux d'origine et la mission de la semaine existent toujours, avec les mêmes règles de base (+10 / −5), les mêmes données et les mêmes API.
- Aucun reseed ni changement de base de données nécessaire.

## Fichiers
- Nouveaux : `public/game-fx.js`, `public/game-fx.css`, `public/parking-core.js`, `tests/pages.test.cjs`, `tests/parking.test.cjs`, `tests/week-deck.test.cjs`, `public/billiard-core.js`, `tests/billiard.test.cjs`, `public/fiches-library.js`, `public/fiches-library.css`, `tests/library.test.cjs`.
- Modifiés : `public/jeux.html`, `public/learning-games.js`, `public/learning-games.css`, `public/jeu-semaine.html`, `public/jeu-semaine.js`, `public/jeu-semaine.css`, `tests/run.cjs`, `package-lock.json`.

## Vérifications effectuées
10 suites de tests automatiques (dont 6 nouvelles) et plus de 110 contrôles dans un vrai navigateur Chromium : parties complètes de chaque jeu (parking de 3 phrases, billard de 6 manches avec tirs réels à la souris), bibliothèque des fiches (tri A–Z, index, recherche par mot, filtres, ouverture d'une fiche, 5 langues), glisser-déposer, clavier, combo, vies, chrono, records, mission avec un seul mot consulté, barre latérale, mobile. Aucune erreur dans la console.
