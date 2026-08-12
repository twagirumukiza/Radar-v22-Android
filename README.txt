RADAR V4 — by twagirumukiza

Nouvelle mécanique à partir du niveau 3 :
- certains contacts apparaissent VERTS et avancent vers le centre ;
- au plus tard au niveau du deuxième cercle, le contact vert révèle son identité ;
- ROUGE = menace : il faut la détruire avant qu'elle atteigne le centre ;
- JAUNE = ami/neutre : il ne faut PAS tirer ;
- tirer sur un jaune fait perdre une DEMI-VIE ;
- un jaune non touché disparaît naturellement au dernier cercle ;
- les rouges continuent jusqu'au centre et font perdre une vie en cas d'impact ;
- nombre et vitesse augmentent avec les niveaux ;
- balayage radar, sons, score et difficultés de la V3.3 conservés.

V4.1 :
- onglet RECORDS sous le tableau ;
- meilleur score ;
- meilleur niveau atteint ;
- total des menaces détruites ;
- nombre de parties jouées ;
- sauvegarde locale persistante ;
- bouton de réinitialisation des records.

V5 ARSENAL :
- Onde EM gagnée tous les 5 niveaux : onde visible, détruit uniquement les rouges.
- Sous-munitions violettes gagnées tous les 3 niveaux : 4 bombes cardinales puis dispersion; collision rouge = explosion.
- Boule bleue gagnée tous les 4 niveaux : rebondit sur bords et contacts verts/jaunes, explose avec une rouge.
- Les stocks s'accumulent.
- Chaque type d'arme est utilisable une seule fois par niveau.

V5.1 — MODE ENTRAÎNEMENT
- bouton dédié depuis l’accueil ;
- les 3 armes sont disponibles en quantité illimitée (∞) ;
- aucune limitation à une utilisation par niveau ;
- aucune consommation du stock ;
- permet de tester librement :
  * Onde électromagnétique ;
  * Sous-munitions violettes ;
  * Boule bleue rebondissante ;
- les résultats du mode entraînement ne modifient pas les records.

V6 — JAUGES DE RÉGÉNÉRATION
- barre et pourcentage sous chaque arme ;
- Sous-munitions : cycle de 3 niveaux ;
- Boule bleue : cycle de 4 niveaux ;
- Onde EM : cycle de 5 niveaux ;
- la progression évolue automatiquement avec le niveau ;
- lorsqu'une arme est gagnée, elle rejoint le stock et un nouveau cycle commence ;
- les stocks non utilisés continuent de s'accumuler ;
- mode Entraînement : jauges à 100 % / ∞.

V7 — MULTIPLICATION AUX CERCLES
- Sous-munitions violettes : chaque projectile se multiplie en 4 branches à CHAQUE premier franchissement d'un cercle radar.
- La multiplication se poursuit en cascade pour les nouvelles sous-munitions aux cercles suivants.
- Les projectiles violets disparaissent au bord et explosent avec les rouges.
- Boules bleues : chaque boule se dédouble lors de son PREMIER franchissement de chacun des trois cercles.
- Les nouvelles boules héritent des cercles déjà franchis pour éviter une duplication infinie sur le même cercle.
- Toutes les boules bleues rebondissent sur le bord et restent en jeu jusqu'à collision avec une rouge.
- Rebond sur contacts verts/jaunes conservé.

V7.1 FIX
- correction du JavaScript qui empêchait le lancement du jeu ;
- fonction de création des projectiles V7 reconstruite proprement ;
- multiplication violette et dédoublement bleu conservés ;
- limite de sécurité à 220 projectiles simultanés pour éviter le gel sur mobile/tablette.

V10 — collision des pions :
- rouge + rouge : les deux rebondissent ;
- rouge + jaune : les deux rebondissent ;
- rouge + vert : les deux rebondissent ;
- légère déviation après choc pour rendre le rebond visible ;
- protection anti-collisions répétées.

V11
- jaune + jaune : rebond des deux contacts.
- Arme noire : +1 tous les 10 niveaux ; triple au premier franchissement de chaque cercle, descendants compris ; rebond sur bord et contacts non rouges ; collision rouge = destruction mutuelle.
- Atomique blanche : +1 tous les 15 niveaux ; double au premier franchissement de chaque cercle, descendants compris ; rebond sur bord et contacts non rouges.
- Collision atomique + rouge : onde circulaire visible qui détruit tous les rouges rencontrés pendant sa propagation.
- Stocks cumulables et une activation par type/niveau.
- Les deux nouvelles armes sont illimitées en mode entraînement.

V12
- Arme noire standard : tous les 7 niveaux.
- Arme atomique blanche standard : tous les 8 niveaux.
- Nouveau MODE LIBRE depuis l'accueil.
- Pour chacune des 5 armes, le joueur choisit :
  1. le premier niveau de génération ;
  2. la fréquence en niveaux.
- Les jauges de régénération s'adaptent aux réglages du mode libre.
- Le mode normal et le mode entraînement sont conservés.

V12.1 — CORRECTION UX MODE LIBRE
- le panneau de configuration du mode libre disparaît dès le lancement de la partie ;
- il reste masqué pendant toute la partie ;
- il est également fermé en mode normal et entraînement ;
- au retour à l'accueil, il reste fermé ;
- il ne réapparaît que lorsque le joueur sélectionne de nouveau MODE LIBRE.

V12.2 FIX — ARSENAL
- correction du stock d'armes qui était réinitialisé lors des changements de niveau ;
- les armes gagnées s'accumulent désormais pendant toute la partie jusqu'à utilisation ;
- seul le verrou « une utilisation par type d'arme et par niveau » est réinitialisé à chaque nouveau niveau ;
- mode normal et mode libre corrigés ;
- test automatique effectué sur une progression niveaux 1→16 :
  Sous-munitions=5, Bleues=4, Onde EM=3, Noires=2, Atomiques=2 si aucune arme n'est utilisée ;
- vérification syntaxique JavaScript effectuée avec succès.

V12.3 — CORRECTION ARSENAL TESTÉE
Cause réelle : le jeu stocke le niveau dans `gLevel`, mais les règles V12 d'attribution et du mode libre lisaient `level`.
Cette variable inexistante provoquait une erreur JavaScript au changement de niveau.

Corrigé :
- attribution normale avec gLevel ;
- attribution du mode libre avec gLevel ;
- jauges du mode libre avec gLevel ;
- stock cumulatif conservé entre niveaux ;
- verrou d'utilisation réinitialisé par niveau sans effacer le stock.

Tests avant livraison :
- syntaxe JavaScript : OK ;
- mode normal niveaux 1→16 : OK ;
- stock N16 sans utilisation = violet 5 / bleu 4 / EM 3 / noir 2 / atomique 2 : OK ;
- conservation des stocks entre niveaux : OK ;
- mode libre avec fréquences personnalisées : OK ;
- fonctions d'activation des 5 armes présentes : OK.

V13 — RECORDS & STATISTIQUES
Le panneau Records conserve maintenant les statistiques de la partie ayant établi le meilleur score :
- menaces détruites ;
- impacts au centre ;
- tirs amis ;
- précision du tir manuel ;
- nombre d'utilisations détaillé pour chacune des 5 armes ;
- menaces détruites par chacune des 5 armes ;
- destructions au tir manuel ;
- arme la plus efficace ;
- ratio destructions / arme utilisée.
Les statistiques d'un record ne sont remplacées que lorsqu'un nouveau meilleur score est établi.
Les anciens records restent compatibles : les nouvelles statistiques commencent à se remplir au prochain record.
Tests : syntaxe JS + modèle de conservation/remplacement du record = OK.

V14 — PERSISTANCE F5
- sauvegarde automatique de la partie en cours dans localStorage ;
- restauration automatique après F5/rechargement ;
- sauvegarde : score, niveau, vies, difficulté, mode normal/entraînement/libre ;
- stocks des 5 armes et armes déjà utilisées dans le niveau ;
- réglages personnalisés du mode libre ;
- statistiques de la partie en cours ;
- contacts présents : type, identification, position, trajectoire et rebond ;
- projectiles actifs : type, position, vitesse et cercles déjà franchis ;
- progression de la vague (spawned/kills) ;
- sauvegarde périodique pendant l'animation + avant fermeture/masquage de page ;
- Quitter et Game Over effacent volontairement la sauvegarde active.
Tests avant livraison : syntaxe JavaScript OK + contrôle du schéma de sauvegarde/restauration OK.

V15 — DERNIÈRE PARTIE + EXPORT/IMPORT/RESET PAR BLOC
- le panneau RECORDS affiche désormais aussi les statistiques de la DERNIÈRE PARTIE jouée (score, niveau, menaces détruites, impacts, amis touchés, précision, tirs/destructions par arme, arme la plus efficace), en plus du meilleur score.
- résumé rapide en haut du panneau : MEILLEUR SCORE / MEILLEUR NIVEAU / DERNIER SCORE / DERNIER NIVEAU.
- export JSON séparé pour le meilleur score et pour la dernière partie (bouton "EXPORTER").
- import JSON séparé pour remplacer le meilleur score ou la dernière partie à partir d'un fichier exporté (bouton "IMPORTER"), avec vérification du format et confirmation avant remplacement.
- réinitialisation séparée : "RÉINITIALISER CE RECORD" (meilleur score uniquement) et "RÉINITIALISER CETTE PARTIE" (dernière partie uniquement), en plus du bouton global "RÉINITIALISER TOUT" (tous les records).
- le mode entraînement ne modifie toujours ni le meilleur score ni la dernière partie enregistrée.

V16 — REBOND ENTRE BOULES AMIES
- les boules amies (bleue, noire, atomique) rebondissent désormais aussi lorsqu'elles entrent en contact ENTRE ELLES, en plus de leur rebond sur le bord et sur les contacts non rouges.
- échange élastique des vitesses (masses égales) + léger écart de séparation pour éviter un rebond répété immédiat.
- les sous-munitions violettes sont explicitement exclues de ce rebond mutuel : elles continuent de se multiplier aux cercles et de disparaître au bord, sans interagir entre elles ni avec les autres boules.
- testé : syntaxe JavaScript OK.

V17 — NOUVELLE ARME : MINE MAGNÉTIQUE
- nouvelle arme de l'arsenal, débloquée tous les 5 niveaux (comme l'onde EM), réglable aussi en Mode Libre (🧲 Mine magnétique : début / fréquence).
- au déclenchement, le centre du radar largue 20 mines magnétiques réparties en 4 anneaux de patrouille concentriques : 2 mines dans le 1er cercle, 4 dans le 2e, 6 dans le 3e, 8 sur le pourtour extérieur (2+4+6+8 = 20).
- les mines patrouillent en rond sur leur anneau (sens alterné selon l'anneau) tant qu'aucune menace n'approche.
- dès qu'une boule rouge identifiée entre dans le cercle d'un anneau, toutes les mines patrouillant sur cet anneau se précipitent vers elle ("chasse").
- à l'impact, la mine explose et détruit la boule rouge visée + toute autre boule rouge dans le rayon de l'explosion + les mines voisines prises dans le souffle (réaction en chaîne possible).
- une fois posées, les 20 mines restent actives et patrouillent jusqu'à la fin du niveau/de la partie (pas de disparition automatique).
- statistiques (tirs, destructions) et sauvegarde/reprise de partie (F5) prises en compte comme pour les autres armes ; testé : syntaxe JavaScript OK, tous les ids référencés existent bien dans le HTML.

V18 — LEURRE
- Nouvelle arme récurrente tous les 4 niveaux (configurable en Mode libre).
- 8 leurres turquoise fluo sont déployés depuis le centre.
- Les 8 leurres restent au nombre de 8 : ils ne se dédoublent plus au passage des anneaux.
- Rebond sur le bord du radar.
- Attraction magnétique des menaces rouges vers le leurre.
- Contact leurre/rouge : destruction des deux et comptabilisation dans les statistiques.
- Contact leurre/ami jaune : rebond des deux, aucune destruction.
- Persistance F5 incluse pour les leurres actifs.


V21 — TEMPS DE JEU
- Temps de jeu ajouté à toutes les statistiques de partie (Joueur, IA, IA + Utilisateur), export/import JSON et persistance F5 inclus.

V23 ANDROID
- Projet Android Studio ajouté dans /android
- WebView native plein écran paysage
- Haptique destruction / impact
- Export JSON Android natif
- Bouton Retour Android
