# 🎨 Midjourney Explore Scraper & Classifier

Système complet d'automatisation pour télécharger des images depuis la page **Midjourney Explore**, les classifier via une logique thématique sémantique, et les servir localement via API.

---

## 📂 Architecture des Scripts (Guide Pratique pour Agents IA & Devs)

Ce dossier contient un ensemble d'outils modulaires conçus pour fonctionner ensemble. Voici le rôle de chaque fichier :

### 1. 🌐 Le Cœur de l'Application
- **`server.mjs`** : Serveur Express qui propulse l'interface Web (sur le port 3456). Il fournit les APIs pour lire le catalogue, lancer le scraper à distance, proxyfier les images Midjourney pour éviter les problèmes CORS, et déclencher la reclassification globale.
- **`database.mjs`** : Couche d'accès aux données exploitant `better-sqlite3`. Gère le fichier `data/catalog.db` qui répertorie toutes les images téléchargées et leurs thèmes, en remplacement de l'ancien système basé sur un lourd fichier JSON.

### 2. ⚙️ Le Moteur de Classification & Paramétrage
- **`config.mjs`** : **Le fichier le plus important pour la logique métier.** Il contient :
  - Les paramètres de scraping (délais, résolution, dossier d'export).
  - Le grand dictionnaire hybride (Anglais/Français) des thèmes et mots-clés de classification. C'est ici qu'on définit les `keywords` et `exclude` pour catégoriser ("portraits", "cinematic", "flora", etc.).

### 3. 🧪 L'Outillage de Développement (Débug & Ajouts)
- **`test_classifier.mjs`** : 🛠️ **Outillage indispensable pour le débogage.** Ne créez plus de petits scripts jetables pour tester la classification ! Utilisez cet utilitaire natif :
  - Tester une phrase spécifique : `node test_classifier.mjs "portrait of a woman in pink"`
  - Tester un ID précis : `node test_classifier.mjs uuid-de-l-image`
  - Tester une image au hasard de la base de données : `node test_classifier.mjs --random`
  *(Le script vous donnera l'itération détaillée, les scores, et la décision finale).*
- **`enhance.mjs`** : Script d'injection massive de mots-clés. Si vous (ou un agent IA) avez une liste de 50 nouveaux mots techniques à ajouter à une catégorie (ex: objectif d'appareil photo, terme d'architecture), insérez la liste dans ce script et faites `node enhance.mjs`. Il modifiera proprement les 1000 lignes de `config.mjs` sans risquer d'oublier une virgule ou de casser la syntaxe JSON.

### 4. 🚀 Les Scrapers
- **`scraper.mjs`** : Le scraper principal basé sur Playwright. Il navigue sur Midjourney, extrait les images et leurs prompts, invoque le classifieur en temps réel, et lance le téléchargement si le thème correspond, tout en respectant les filtres définis dans `config.mjs`.
- **`fast-scraper.mjs`** : Une variante allégée et beaucoup plus rapide qui télécharge le flux d'images "en vrac", sans aucune analyse de prompt ni tri préalable.

### 5. 🛟 L'Utilitaire de Secours
- **`recover.mjs`** : Si des images du dossier `downloads/` ont été accidentellement supprimées mais sont toujours présentes dans la base de données (`catalog.db`), ce script passera en revue la base et utilisera Playwright pour retourner silencieusement retélécharger uniquement les fichiers manquants pour retrouver un état sain.

---

## 🛠️ Usage Courant

### Démarrage global (Scraper + Serveur + App)
Le projet global (depuis la racine du repo) utilise concurrentment (géré par npm):
```bash
npm run dev:all
```
Cela lance l'UI Web Vite et `server.mjs` en parallèle.

### Lancer un Scraping Manuel (en ligne de commande)
Vous pouvez lancer le scraper directement sans passer par l'Interface Web :
```bash
# Scraper uniquement les thèmes liés aux portraits (défini dans config)
node scraper.mjs --themes portraits --limit 100 --tab new --headless

# Scraper tous les thèmes connus dans config.mjs
node scraper.mjs --themes all --limit 200 --resolution high
```

## ⚠️ Notes pour les futurs Agents IA
1. Ne **créez pas** de fichiers temporaires de tests pour le classifieur. Utilisez `test_classifier.mjs`.
2. Soyez très attentif dans les ajouts au fichier `config.mjs`. Beaucoup d'images proviennent de créateurs anglophones (les prompts initiaux sont donc presque toujours en Anglais). Gardez la dualité Anglais/Français dans les listes de `keywords`.
3. Pour éviter les conflits (exemple : le "rose" en tant que fleur versus en tant que couleur), utilisez méticuleusement la propriété `exclude` des thèmes.
