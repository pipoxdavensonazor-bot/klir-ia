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
| **Intégrations** | Aucune (Slack/Telegram à connecter) |

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

- **`gpt-5.6-luna` + tools** : incompatible avec `fetch_klir_skill` (erreur reasoning_effort). Utiliser `gpt-5-mini` ou `gpt-5-nano`.  
- **`gpt-4o-mini`** : non autorisé avec les crédits n8n gratuits.  
- Après modification du brouillon : `validate_agent` → `publish_agent`.

## Test rapide (Preview)

Demander : *« Quel skill pour une séquence cold email B2B ? »*  
→ Réponse attendue : **cold-email**
