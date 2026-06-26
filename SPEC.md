# Réservator GDJV — Spécification fonctionnelle

## Contexte

Application web de gestion du matériel de camp pour l'association GDJV (scouts / camps de jeunes).  
Stack : HTML/CSS/JS vanilla (fichier unique `index.html`) + Google Apps Script (`Code.gs`) + Google Sheets comme base de données.

---

## Architecture

### Frontend
- Fichier unique `index.html`, hébergé sur GitHub Pages
- Pas de framework, pas de dépendances externes
- Communication avec le backend via `fetch` (GET / POST) vers l'URL du Web App Apps Script

### Backend — `Code.gs`
- Google Apps Script déployé en Web App (accès anonyme)
- `doGet(e)` : actions en lecture (`getInventaire`, `getReservations`, `getHistorique`)
- `doPost(e)` : actions en écriture (`addReservation`, `updateReservation`, `confirmerDepart`, `addRetour`, `addCommentaire`)

### Base de données — Google Sheets
4 onglets :

| Onglet | Rôle |
|---|---|
| Inventaire | Catalogue du matériel |
| Réservations | Demandes de réservation |
| Retours | Détail des retours article par article |
| Historique | Journal de tous les événements |

---

## Inventaire

### Colonnes du sheet Inventaire
`Référence | Nom | Type | Catégorie | Total | Disponible | État | Notes | Contenu`

### Types d'articles
- `article` : élément unitaire avec quantité
- `caisse` : boîte de matériel, traitée comme 1 unité indivisible

### Champ `Disponible`
- Mis à jour automatiquement lors des départs (décrémenté) et des retours (incrémenté)
- Valeur initiale = Total

### Champ `État`
- Valeurs possibles dans le sheet : `ok`, `warn`, `alert`
- Affiché en badge coloré dans l'interface
- **Si l'article a une note, l'état affiché est forcé à "A vérifier"** (badge orange), quelle que soit la valeur du champ État dans le sheet

### Champ `Notes`
- Accumulation de notes séparées par ` | `
- Format de chaque note : `dd/MM - texte`
- Pas d'auteur, juste la date
- Les observations saisies lors d'un retour s'ajoutent automatiquement aux notes de l'article concerné
- Suppression des notes : manuellement dans le sheet (pas d'interface de suppression)

### Interface inventaire
- Tableau avec colonnes : Ref, Désignation, Type, Catégorie, Disponible, État, Qté, (actions)
- Barre de recherche texte libre
- Filtres par catégorie (chips) : Tentes, Cuisine, Sport, Bureautique, Camping, Loisirs, Linge, Mobilier, Divers, Hygiène
- Sélection d'articles avec cases à cocher
- Stepper de quantité par article (min 1, max = disponible)
- Les caisses sont toujours à quantité 1
- Panier flottant en bas d'écran : nombre d'articles sélectionnés + bouton "Réserver cette sélection"

### Disponibilité avec dates
- Barre de dates en haut (Départ + Retour) permettant de filtrer les disponibilités
- Sans dates : affiche le stock total disponible
- Avec dates : affiche la disponibilité réelle en tenant compte des réservations qui se chevauchent (statut ≠ Refusé / Retourné)
- Article indisponible sur la période : quantité disponible = 0, article non sélectionnable

### Notes — modale
- Clic sur le badge état d'un article ouvre une modale
- La modale affiche l'historique des notes et permet d'ajouter une nouvelle note
- La note est envoyée via l'action `addCommentaire` (POST)

---

## Réservations

### Flux de statut

```
En attente → Validé (manuel dans le sheet) → Parti → Retourné
                                           ↘ Refusé (manuel dans le sheet)
```

- **"En attente"** : demande créée depuis l'application
- **"Validé"** : validation manuelle dans Google Sheets par le responsable matériel
- **"Parti"** : confirmé depuis l'onglet Départs de l'application
- **"Retourné"** : confirmé depuis l'onglet Retours de l'application
- **"Refusé"** : refus manuel dans Google Sheets

### Colonnes du sheet Réservations
`Id | Date demande | Camp | Directeur | Matériel | Matériel au départ | Dates départ | Date retour | Statut | Notes`

Note : le champ `Id` utilise la casse exacte `'Id'` dans le sheet.

### Création d'une réservation
- Formulaire : Nom du camp, Directeur, Date départ, Date retour, Notes libres
- Matériel = sélection depuis l'inventaire (panier)
- Vérification de conflit **avant** envoi (frontend) : si conflit → message d'erreur avec liste des articles concernés
- Vérification de conflit **côté backend** également (double validation)
- En cas de conflit : retour `{error: "CONFLICT", details: [...]}` — pas d'enregistrement
- L'ID de réservation est généré côté backend : `RES-<timestamp>`

### Modification d'une réservation
- Bouton Modifier sur chaque ligne du tableau des réservations
- Modale de modification : camp, directeur, dates, notes, matériel (saisie texte libre `ref x qte`)
- Action `updateReservation` (POST)

### Détection de conflits
- Conflit = chevauchement de dates avec une réservation existante dont le statut n'est ni "Refusé" ni "Retourné"
- Comparaison : `dateDepart1 ≤ dateRetour2 AND dateRetour1 ≥ dateDepart2`
- Le backend exclut la réservation en cours de modification (`excludeId`)

---

## Départs

### Affichage
- Liste toutes les réservations au statut **"Validé"** (normalisé sans accents ni majuscules)
- Pas de filtre par date — toutes les réservations validées apparaissent

### Interface par réservation
- En-tête : Nom du camp, Directeur, dates départ/retour
- Barre de progression : X / N articles vérifiés
- Pour chaque article :
  - Case à cocher (coché = part, décoché = ne part pas)
  - Stepper de quantité (modifiable entre 0 et la quantité réservée)
  - Les caisses n'ont pas de stepper (quantité toujours 1)

### Confirmation du départ
- Bouton "Confirmer le départ"
- Envoie la liste des articles **réellement partis** avec leurs quantités effectives (`materielAuDepart`)
- Action `confirmerDepart` (POST) :
  - Écrit `materielAuDepart` dans la colonne dédiée du sheet
  - Passe le statut à "Parti"
  - Décrémente le champ `Disponible` de chaque article dans l'Inventaire

---

## Retours

### Affichage
- Liste toutes les réservations au statut **"Parti"**
- Indicateur visuel si la date de retour prévue est dépassée ("EN RETARD")

### Matériel affiché
- Utilise la colonne `Matériel au départ` si renseignée (quantités réellement parties)
- Sinon fallback sur la colonne `Matériel` (quantités réservées initialement)

### Interface par article retourné
- Quantité retournée (input numérique, min 0, max = qté partie)
- État de retour : Bon état / Usure légère / À réparer / Hors service (+ Incomplète pour les caisses)
- Observations libres

### Validation du retour
- Action `addRetour` (POST) — opérations isolées avec try/catch indépendants :
  1. Enregistrement dans le sheet Retours (une ligne par article)
  2. Mise à jour `Disponible` dans l'Inventaire (+qté retournée)
  3. Ajout des observations non vides dans les Notes de l'article (Inventaire)
  4. Passage du statut à "Retourné" dans le sheet Réservations
- Si une opération échoue, les autres continuent (pas de rollback global)
- Retour `{success: true, warnings: [...]}` si des erreurs partielles

---

## Historique

- Affichage chronologique inversé de tous les événements
- Colonnes : Date/heure, Type, Id réservation, Camp, Directeur, Détail
- Types d'événements loggés : Réservation, Modification, Parti, Retour

---

## Points techniques importants

### Normalisation des statuts
Tous les comparaisons de statut utilisent `normStatut()` / `normSt()` :
```
toLowerCase() → normalize('NFD') → suppression des diacritiques → suppression des non-lettres
```
Exemples : `"Validé"` → `"valide"`, `"Retourné"` → `"retourne"`, `"En attente"` → `"enattente"`

### Résolution des colonnes (backend)
`colMap(sheet)` construit un dictionnaire `{ nomColonne: indexBase1 }` en lisant les en-têtes réels.  
Chaque en-tête est indexé **deux fois** : avec son nom exact et en minuscules.  
Permet de gérer la variabilité de casse (ex: `'Id'` est accessible via `cols['Id']` et `cols['id']`).

### ID de réservation (frontend)
`resId(r)` = `r["ID"] || r["Id"] || r["id"] || ""` — robuste aux variations de casse de l'en-tête.

### Conflits côté frontend
Avant d'envoyer la demande, le frontend calcule lui-même les conflits en comparant le matériel sélectionné avec les réservations existantes (déjà chargées en mémoire). En cas de conflit, l'envoi est bloqué avec un message d'erreur détaillé. Le backend effectue la même vérification en doublon.

---

## Interface responsive

- Navigation : barre horizontale sur desktop, hamburger (☰) sur mobile (< 640 px)
- Le dropdown mobile affiche les onglets verticalement
- Tableaux inventaire et réservations : scroll horizontal sur mobile (`overflow-x: auto`)
- Formulaires : 1 colonne sur mobile, 2 colonnes sur desktop

---

## Déploiement

| Composant | Hébergement |
|---|---|
| `index.html` | GitHub Pages (`djeannin-ops.github.io/materiel-camp/`) |
| `Code.gs` | Google Apps Script (Web App, accès anonyme) |
| Données | Google Sheets (même compte Google que le Apps Script) |

La constante `SCRIPT_URL` dans `index.html` pointe vers l'URL du déploiement Apps Script actuel.  
À chaque modification de `Code.gs`, il faut créer une **nouvelle version** dans Apps Script (l'URL reste identique).
