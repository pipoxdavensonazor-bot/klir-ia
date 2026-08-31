# Agent n8n Klir IA

**Statut :** Publié  
**URL éditeur :** https://klirline.app.n8n.cloud/projects/LiHOvWVYD0jZZWNG/agents/SrOtsGvMD3XOIgha  
**Agent ID :** `SrOtsGvMD3XOIgha`

## Configuration actuelle

| Élément | Valeur |
|--------|--------|
| **Modèle** | `openai/gpt-5-mini` (crédits n8n) |
| **Credential** | OpenAI managed (`Mn3OKmfC5NpOLs1J`) |
| **Skills API** | `fetch_klir_skill` → https://klirline.io/api/skills/{name} (~92 skills) |
| **Sidecar skills** | Skill Router, Humaniser, Klirline Produits |
| **Mémoire** | Episodic (n8n) |
| **Web search** | Activé |
| **Tâche planifiée** | Briefing marketing hebdo — lundi 9h `America/Montreal` |
| **Intégrations** | Telegram `@klir_ia_bot` (privé) · Slack `Klirline CORE - Klir IA` |
| **Automatisations** | Briefing → Slack · Email approbation · Calendrier contenu |

## Automatisations (workflows)

| Workflow | ID | Rôle |
|----------|-----|------|
| [Post Marketing Slack](https://klirline.app.n8n.cloud/workflow/8P1LUduOngmg8n3e) | `8P1LUduOngmg8n3e` | Publie un message dans le canal marketing Slack |
| [Email Approval Slack](https://klirline.app.n8n.cloud/workflow/hORmQbmGpzYtc6lY) | `hORmQbmGpzYtc6lY` | Slack approbation → envoi Gmail |
| [Content Calendar](https://klirline.app.n8n.cloud/workflow/vx5VkRIVYz9xhNrC) | `vx5VkRIVYz9xhNrC` | Notion + backup data table calendrier |

**Data table :** `Klir IA - Calendrier contenu` (`5NsGccUBJuh6QccY`) — colonnes : week, channel, format, title, status, notes.

### Canal Slack marketing

Le workflow cible **`#social`** (`C0BEFR1UMLK`) en attendant la création de **`#marketing`**.

Pour basculer vers `#marketing` :
1. Créer le canal dans Slack → `/invite @Klir IA`
2. Dans n8n, ouvrir **Klir IA - Post Marketing Slack** et **Email Approval Slack**
3. Changer le canal vers `#marketing`

### Briefing hebdo (lundi 9h)

L’agent :
1. Génère le briefing (3 idées + SEO/CRO + action)
2. Appelle `post_marketing_slack` → message dans `#social`
3. Appelle `save_content_calendar` pour chaque idée

### Email avec approbation + Gmail

Flux : **Slack approbation → envoi Gmail**

1. L’agent appelle `request_email_approval` (to, subject, body)
2. Brouillon dans `#social` → **Approuver envoi** / **Refuser**
3. Si approuvé → nœud **Send Gmail** envoie l’email

#### Connecter Gmail (5 min)

1. [n8n Credentials](https://klirline.app.n8n.cloud/home/credentials) → **Add credential** → **Gmail OAuth2**
2. Connecter le compte d’envoi (ex. `pipoxdavensonazor@gmail.com` ou `marketing@klirline.io`)
3. Ouvrir [Email Approval Slack](https://klirline.app.n8n.cloud/workflow/hORmQbmGpzYtc6lY)
4. Nœud **Send Gmail** → sélectionner le credential → **Save** → **Publish**

Test Slack : *« Rédige un email test à mon adresse et envoie-le en approbation »*

---

### Calendrier contenu → Notion

Flux : **Notion (principal) + Data Table n8n (backup)**

Le workflow écrit d’abord dans Notion ; si Notion échoue, le backup data table prend le relais.

#### 1. Créer la base Notion

Dans Notion, créer une base **`Klir IA - Calendrier contenu`** avec ces propriétés :

| Propriété | Type | Options |
|-----------|------|---------|
| **Title** | Title | (défaut) |
| **Week** | Text | ex. `Semaine 36` |
| **Channel** | Select | `linkedin`, `email`, `x`, `instagram`, `blog` |
| **Format** | Select | `post`, `newsletter`, `thread`, `reel`, `article` |
| **Status** | Select | `planned`, `draft`, `published`, `cancelled` |
| **Notes** | Text | optionnel |

#### 2. Intégration Notion

1. [notion.so/my-integrations](https://www.notion.so/my-integrations) → **New integration** → nom `Klir IA n8n`
2. Dans Notion, ouvrir la base → **⋯** → **Connect to** → `Klir IA n8n`

#### 3. Credential n8n

1. [n8n Credentials](https://klirline.app.n8n.cloud/home/credentials) → **Notion API** (Internal Integration Secret)
2. Coller le token de l’intégration

#### 4. Brancher le workflow

1. Ouvrir [Content Calendar](https://klirline.app.n8n.cloud/workflow/vx5VkRIVYz9xhNrC)
2. Nœud **Save to Notion** → credential + base **`Klir IA - Calendrier contenu`**
3. **Publish**

Test : *« Ajoute au calendrier : post LinkedIn KlirlineOS, semaine 36, planned »*

**Backup :** data table n8n `Klir IA - Calendrier contenu` reste active si Notion est indisponible.



## Prompt système

Le prompt mentionne **~92 skills** et charge les playbooks via `fetch_klir_skill`.  
Prioritaires : copywriting, social, emails, seo-audit, content-strategy, product-marketing, humaniser-texte, klirline-produits, cold-email, cro, analytics.

## Connecter Telegram (privé)

### 1. Créer le bot (@BotFather)

1. Ouvrir Telegram → chercher **@BotFather**
2. Envoyer `/newbot`
3. Choisir un **nom affiché** (ex. `Klir IA Marketing`)
4. Choisir un **username** unique finissant par `bot` (ex. `klir_ia_marketing_bot`)
5. Copier le **token** (format `123456789:ABCdef...`) — ne le partagez pas publiquement

Optionnel dans BotFather :
- `/setdescription` — « Assistant marketing Klirline — copy, social, SEO, emails »
- `/setabouttext` — lien https://klirline.io

### 2. Credential n8n

1. [n8n Credentials](https://klirline.app.n8n.cloud/home/credentials) → **Add credential**
2. Type : **Telegram API**
3. Coller le **Access Token** du bot → Save

### 3. Connecter l’agent (privé)

Dans l’éditeur agent → **Integrations** → Telegram → sélectionner le credential.

Paramètres accès **privé** :
```json
{
  "accessMode": "private",
  "allowedUsers": ["@VOTRE_USERNAME_TELEGRAM"]
}
```

Remplacez `@VOTRE_USERNAME_TELEGRAM` par votre handle (sans espaces).  
Seuls ces utilisateurs pourront DM le bot.

L’agent est déjà publié — la connexion Telegram devient active immédiatement.

### 4. Tester

1. Ouvrir **https://t.me/klir_ia_bot** (bot : `@klir_ia_bot`)
2. **Start** / envoyer un message depuis **`@klirlineofficial`** (compte autorisé en mode privé)
3. Exemple : *« Écris 3 hooks LinkedIn pour Klirline »*

---

## Connecter Slack

Klir IA répond aux **@mentions**, **DM** et fils Slack une fois le bot connecté à l’agent n8n.

### 1. Créer l’app Slack

1. Ouvrir [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. **App Name** : `Klir IA` (ou similaire)
3. **Workspace** : votre workspace Klirline

### 2. Scopes bot (OAuth & Permissions)

Dans **OAuth & Permissions** → **Bot Token Scopes**, ajouter au minimum :

| Scope | Pourquoi |
|-------|----------|
| `app_mentions:read` | Réagir quand on @mentionne le bot |
| `chat:write` | Envoyer des messages |
| `im:history`, `im:read`, `im:write` | DM avec le bot |
| `channels:history`, `channels:read` | Lire le contexte d’un canal public |
| `groups:history`, `groups:read` | Canaux privés (optionnel) |
| `users:read` | Résoudre les utilisateurs |

Puis **Install to Workspace** → autoriser.

Copier le **Bot User OAuth Token** (`xoxb-...`) — ne le partagez pas publiquement.

### 3. Credential n8n

1. [n8n Credentials](https://klirline.app.n8n.cloud/home/credentials) → **Add credential**
2. Type : **Slack API**
3. Coller le **Access Token** (`xoxb-...`) → **Save**
4. Noter le nom du credential (ex. `Slack Klir IA`)

### 4. Connecter l’agent

Dans l’[éditeur agent](https://klirline.app.n8n.cloud/projects/LiHOvWVYD0jZZWNG/agents/SrOtsGvMD3XOIgha) → **Integrations** → **Slack** → sélectionner le credential.

L’agent est déjà publié — Slack devient actif immédiatement après connexion.

### 5. Inviter le bot

Dans un canal Slack :

```
/invite @Klir IA
```

(Remplacez par le nom affiché de votre app.)

### 6. Tester

- **DM** : ouvrir une conversation directe avec `@Klir IA` → *« Écris 3 hooks LinkedIn pour Klirline »*
- **Canal** : `@Klir IA quel skill pour une landing page B2B ?`

Réponse attendue : routage vers un skill (ex. `copywriting`, `cro`) + livrable en FR-CA.

---

## Notes modèle / publish

- **`gpt-5.6-luna` + tools** : incompatible avec `fetch_klir_skill` (erreur `reasoning_effort`). Utiliser `gpt-5-mini`.
- **`gpt-4o-mini`** : non autorisé avec les crédits n8n gratuits.
- Après modification du brouillon : `validate_agent` → `publish_agent`.

## Test rapide (Preview)

Demander : *« Quel skill pour une séquence cold email B2B ? »*  
→ Réponse attendue : **cold-email**
