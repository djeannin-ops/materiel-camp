# Réservator GDJV — Guide d'utilisation

Application de gestion du matériel de camp de l'association GDJV.  
Accès : [djeannin-ops.github.io/materiel-camp/](https://djeannin-ops.github.io/materiel-camp/)

---

## Vue d'ensemble

L'application permet à l'équipe de :
- consulter le stock de matériel disponible sur une période donnée
- faire une demande de réservation
- préparer et confirmer un départ (vérification article par article)
- enregistrer un retour avec l'état de chaque article
- ajouter des commentaires sur le matériel (casse, usure, manque...)

Le responsable matériel valide les demandes directement dans Google Sheets.

---

## Navigation

La barre du haut donne accès aux 5 sections :

| Onglet | Rôle |
|---|---|
| **Inventaire** | Consulter le stock et faire une sélection |
| **Réservations** | Soumettre une demande et voir les réservations en cours |
| **Départs** | Préparer les départs des camps validés |
| **Retours** | Enregistrer le retour du matériel |
| **Historique** | Consulter le journal de tous les mouvements |

Sur smartphone, un bouton ☰ en haut à droite ouvre le menu.

---

## Barre de dates

En haut de toutes les pages, deux champs permettent de saisir les dates de départ et de retour du camp. Une fois renseignées, l'inventaire affiche les **disponibilités réelles** sur cette période, en tenant compte des autres réservations qui se chevauchent.

Sans dates, l'inventaire affiche le stock total disponible (hors articles actuellement en camp).

---

## 1 — Inventaire

### Consulter le stock

- Utilisez la barre de recherche pour trouver un article par nom ou référence.
- Les chips de catégorie (Tentes, Cuisine, Sport…) filtrent la liste.
- La colonne **Disponible** indique combien d'unités sont disponibles sur votre période.
- Un article en rouge avec "0 / N Indispo" n'est pas disponible sur les dates saisies.

### Badges d'état

| Badge | Signification |
|---|---|
| 🟢 Bon état | Matériel en bon état |
| 🟡 A vérifier | Matériel à inspecter avant départ (ou article ayant une note) |
| 🔴 Alerte | Matériel hors service ou problème signalé |

Un point orange à côté du badge indique qu'il y a des notes sur cet article. **Cliquer sur le badge** ouvre l'historique des notes et permet d'en ajouter une.

### Sélectionner du matériel

1. Cochez les articles souhaités avec la case à gauche.
2. Ajustez les quantités avec les boutons **−** et **+** (les caisses sont toujours à 1).
3. Le panier flottant en bas de l'écran affiche le nombre d'articles sélectionnés.
4. Cliquez sur **Réserver cette sélection** pour passer à l'étape suivante.

---

## 2 — Réservations

### Faire une demande

Après avoir sélectionné du matériel depuis l'inventaire :

1. Remplissez les champs **Nom du camp** et **Directeur**.
2. Vérifiez les dates de départ et de retour (pré-remplies depuis la barre de dates).
3. Ajoutez des notes si besoin (demandes particulières, précisions…).
4. Cliquez sur **Envoyer la demande**.

Si un article n'est plus disponible sur la période, un message d'erreur détaille les conflits — la demande n'est pas envoyée.

Pour modifier la sélection avant d'envoyer, cliquez sur **Modifier la sélection**.

### Statuts d'une réservation

```
En attente → Validé → Parti → Retourné
           ↘ Refusé
```

| Statut | Ce que ça signifie |
|---|---|
| **En attente** | Demande soumise, en attente de validation |
| **Validé** | Validé par le responsable dans Google Sheets |
| **Parti** | Départ confirmé dans l'application |
| **Retourné** | Matériel retourné et enregistré |
| **Refusé** | Refusé par le responsable dans Google Sheets |

> **Note pour le responsable matériel** : la validation et le refus se font directement dans le fichier Google Sheets, colonne "Statut" de l'onglet Réservations. Saisir "Validé" ou "Refusé".

### Modifier une réservation

Depuis le tableau des réservations en cours, cliquez sur le bouton **Modifier** d'une ligne pour corriger le camp, le directeur, les dates, les notes ou le matériel.

---

## 3 — Départs

Cet onglet liste toutes les réservations au statut **Validé**.

### Préparer un départ

Pour chaque réservation, une liste de contrôle s'affiche avec tous les articles réservés :

1. **Cochez** chaque article effectivement présent et prêt à partir.
2. **Ajustez les quantités** si certains articles ne peuvent partir qu'en partie.
3. Décochez les articles qui ne partent finalement pas.
4. La barre de progression en haut de la carte indique l'avancement.

### Confirmer le départ

Cliquez sur **Confirmer le départ** quand tout est vérifié. L'application :
- enregistre les quantités réellement parties dans le sheet
- passe le statut à "Parti"
- met à jour les stocks disponibles dans l'inventaire (décrémentation)

---

## 4 — Retours

Cet onglet liste toutes les réservations au statut **Parti**.  
Si la date de retour prévue est dépassée, la mention **EN RETARD** apparaît en rouge.

### Enregistrer un retour

Pour chaque article retourné, remplissez :

| Champ | Détail |
|---|---|
| **Qté retournée** | Nombre d'unités effectivement rendues (peut être inférieur à la qté partie) |
| **État** | Bon état / Usure légère / À réparer / Hors service (+ Incomplète pour les caisses) |
| **Observations** | Description libre : casse, pièce manquante, problème constaté… |

Cliquez sur **Valider le retour** quand tous les articles sont renseignés. L'application :
- enregistre le détail du retour dans le sheet Retours
- recrédite le stock disponible dans l'inventaire (+ qté retournée)
- ajoute les observations dans les notes de l'article concerné (visible dans l'inventaire)
- passe le statut de la réservation à "Retourné"

> Si un article revient abîmé ou incomplet, notez-le dans les observations — cela apparaîtra automatiquement dans les notes de l'article et passera son badge en "A vérifier".

---

## 5 — Historique

Journal chronologique de tous les événements : créations, modifications, départs, retours.  
Utile pour retrouver qui a réservé quoi et quand.

---

## Notes sur le matériel

Chaque article de l'inventaire dispose d'un historique de notes. Pour en consulter ou en ajouter une :

1. Dans l'onglet **Inventaire**, cliquez sur le badge d'état d'un article.
2. La modale affiche les notes existantes avec leur date.
3. Saisissez votre note dans le champ du bas et cliquez sur **Ajouter**.

Les notes s'accumulent dans le temps (format : `26/06 - Texte de la note`).  
Pour supprimer une note, éditez directement la colonne Notes dans Google Sheets.

---

## Gestion du stock (responsable matériel)

Certaines actions se font directement dans **Google Sheets** :

| Action | Comment faire dans le sheet |
|---|---|
| Valider une réservation | Onglet Réservations → colonne Statut → saisir `Validé` |
| Refuser une réservation | Onglet Réservations → colonne Statut → saisir `Refusé` |
| Corriger un stock | Onglet Inventaire → colonne Disponible → modifier la valeur |
| Supprimer une note | Onglet Inventaire → colonne Notes → éditer ou vider la cellule |
| Changer l'état d'un article | Onglet Inventaire → colonne État → `ok`, `warn` ou `alert` |

---

## FAQ

**Le matériel n'apparaît pas dans les Départs alors que la réservation est validée ?**  
Vérifiez que le statut dans le sheet est bien `Validé` (avec accent, V majuscule). L'application normalise les accents donc `Validé`, `validé` ou `VALIDE` fonctionnent tous.

**Un article est marqué "A vérifier" sans que son état soit `warn` dans le sheet ?**  
C'est normal : dès qu'un article a des notes, l'application affiche "A vérifier" pour attirer l'attention. Consultez les notes en cliquant sur le badge.

**La disponibilité affichée semble incorrecte ?**  
Vérifiez la colonne Disponible dans le sheet Inventaire. Elle est mise à jour automatiquement lors des départs et retours, mais peut être corrigée manuellement si nécessaire.

**Je ne vois pas de retour en attente alors que le camp est rentré ?**  
La réservation doit être au statut `Parti` (confirmé depuis l'onglet Départs). Si le statut est encore `Validé`, confirmez d'abord le départ.
