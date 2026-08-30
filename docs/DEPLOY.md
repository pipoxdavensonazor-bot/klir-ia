# Déploiement Klir IA sur klirline.io

## Prérequis

- Compte Cloudflare avec zone `klirline.io`
- Wrangler CLI authentifié : `npx wrangler login`
- Secret OpenAI : `npx wrangler secret put OPENAI_API_KEY`

## Build & Deploy

```powershell
cd "D:\001-Klirline INC\New folder"
npm install
npm run build
npm run deploy
```

## Statut deploy (2026-08-25)

**Worker déployé :** https://klir-ia.pipoxdavensonazor.workers.dev  
**Custom domains :** échec partiel — records DNS existants sur klirline.io

### Erreur Cloudflare

```
Hostname 'www.klirline.io' already has externally managed DNS records (A, CNAME, etc).
Delete them first or try a different hostname. [code: 100117]
```

### Action DNS requise

Dans Cloudflare → zone **klirline.io** :

1. **Supprimer** les records A/CNAME existants pour `@` et `www` qui pointent ailleurs
2. Re-lancer : `npm run deploy`
3. Wrangler créera automatiquement les custom domains via `wrangler.jsonc`

**Ou manuellement :**

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `klir-ia.pipoxdavensonazor.workers.dev` | Proxied |
| CNAME | `www` | `klir-ia.pipoxdavensonazor.workers.dev` | Proxied |

Puis ajouter les custom domains dans Workers → klir-ia → Settings → Domains.

## Secrets production

```powershell
npx wrangler secret put OPENAI_API_KEY
# Mettre AI_SANDBOX=false dans wrangler.jsonc vars pour prod
```

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `<worker-subdomain>.workers.dev` ou route custom domain Worker | Proxied |
| CNAME | `www` | `<worker-subdomain>.workers.dev` ou route custom domain Worker | Proxied |

**Alternative (recommandée avec wrangler routes) :**

Le fichier `wrangler.jsonc` declare déjà :

```json
"routes": [
  { "pattern": "www.klirline.io", "custom_domain": true },
  { "pattern": "klirline.io", "custom_domain": true }
]
```

Après `npm run deploy`, Wrangler configure automatiquement les custom domains si la zone est sur le même compte Cloudflare.

## Variables d'environnement Worker

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Secret (wrangler secret) |
| `OPENAI_MODEL` | `gpt-4o-mini` (défaut dans wrangler.jsonc) |
| `AI_SANDBOX` | `false` en production |
| `RATE_LIMIT_MAX` | 30 req/IP/heure (défaut) |

Secrets optionnels fallback :
- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`

## Vérification post-deploy

1. https://klirline.io — landing + chat
2. https://klirline.io/api/skills — liste JSON (~92 skills)
3. https://klirline.io/api/skills/copywriting — détail skill
4. POST https://klirline.io/api/chat — `{ "messages": [{ "role": "user", "content": "Écris un headline pour Klirline" }] }`

## Évals golden set (`npm run eval`)

1. Définir un secret Worker `EVAL_API_KEY` (valeur aléatoire longue) :

```powershell
npx wrangler secret put EVAL_API_KEY
```

2. Lancer les évals contre la prod :

```powershell
$env:EVAL_API_KEY = "<même valeur>"
npm run eval
```

Sans `EVAL_API_KEY`, les requêtes invitées sont bloquées après 3 appels (`GUEST_SEARCH_LIMIT`).

### CI GitHub Actions

Workflow : `.github/workflows/eval.yml`

| Job | Mode | Quand |
|-----|------|-------|
| **Golden set** | Statique (`evals/golden-fixtures.json`) | push / PR |
| **Golden set (live prod)** | API prod + `EVAL_API_KEY` | manuel (`workflow_dispatch`) |
| **Trading charts** | Statique (source) | push / PR |

Secret optionnel pour live manuel : **Settings → Secrets → Actions** → `EVAL_API_KEY`.

**Local :** `npm run eval` (live) · `npm run eval -- --static-only` (fixtures) · `npm run eval:trading` (live).

Les rapports JSON sont uploadés en artifacts (`evals/results/`).

Cloudflare bloque les fetch live depuis les runners GitHub — le CI push utilise les fixtures statiques. Mettre à jour `evals/golden-fixtures.json` si les checks du golden set changent.

## Auth Clerk + historique D1

1. Créer une application sur [dashboard.clerk.com](https://dashboard.clerk.com) (domaines : `klirline.io`, `localhost:3000`).
2. Secrets Worker :

```powershell
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
```

3. Pour le build client, ajouter aussi la publishable key en var (ou `.env.local` en local) :

```powershell
# wrangler.jsonc → vars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_..."
```

4. Migrations D1 (déjà créées) :

```powershell
npm run db:migrate:remote
```

5. `npm run deploy`

Chat anonyme : **3 recherches** puis compte obligatoire. Historique / sidebar / fichiers / studio uniquement si connecté.

## Studio Klir IA

| Capacité | Endpoint / UI |
|----------|----------------|
| Copier réponse | Bouton Copier sous chaque bulle |
| Gate 3 recherches | `localStorage` + `403 SIGNUP_REQUIRED` sur `/api/chat` |
| Mémoire | Titres des 8 dernières conversations injectés dans le system prompt |
| Pièces jointes | `POST /api/attachments` → R2 `klir-ia-attachments` + D1 `attachments` |
| Flyer / mockup | `POST /api/studio/image` (Gemini image ou SVG fallback) |
| Mini-site + Cloudflare | `POST /api/studio/site` + lien Pages dashboard |
| Photos licenciées | `GET /api/studio/media?q=` (Unsplash puis Pexels) |

### R2 + migration

Bucket actuel : **`klirai`** (binding Worker `ATTACHMENTS`).

```powershell
npm run db:migrate:remote
npm run deploy
```

Sans binding R2, les pièces jointes ≤ ~900 Ko étaient stockées en D1 (fallback).

### Secrets médias (optionnel)

```powershell
npx wrangler secret put UNSPLASH_ACCESS_KEY
npx wrangler secret put PEXELS_API_KEY
```

### Héberger un site généré

1. Copier le HTML depuis le chat
2. Cloudflare Dashboard → Workers & Pages → Create → Upload assets  
   ou `npx wrangler pages deploy ./dossier --project-name=mon-site-klir`
3. **Pas de déploiement auto** sur le compte Klirline sans confirmation explicite

## Billing (Stripe + MonCash + USDT)

Page : https://klirline.io/pricing

Packs crédits (1 crédit = 1 message) :

| Pack | Crédits | Prix (hors taxes) |
|------|---------|-------------------|
| Gratuit (inscription) | 500 | 0 $ |
| pack1500 | 1 500 | 10 $ + taxes |
| pack5000 | 5 000 | 30 $ + taxes |
| pack10000 | 10 000 | 50 $ + taxes + support |

### Stripe

1. Créer 3 Products + Prices **one-time** dans Stripe.
2. Activer Stripe Tax (registrations CA) pour TPS/TVQ au checkout.
3. Secrets :

```powershell
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PRICE_PACK1500
npx wrangler secret put STRIPE_PRICE_PACK5000
npx wrangler secret put STRIPE_PRICE_PACK10000
```

3. Webhook endpoint : `https://klirline.io/api/webhooks/stripe`  
   Events : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

### MonCash (Haïti)

```powershell
npx wrangler secret put MONCASH_CLIENT_ID
npx wrangler secret put MONCASH_CLIENT_SECRET
```

Return URL Digicel (portail marchand) → `https://klirline.io/api/checkout/moncash/return`  
`MONCASH_SANDBOX=false` en prod (var `wrangler.jsonc`).

Secrets depuis le fichier Digicel (`Client Id` / `Client Secret` / `Business Key`) :

```powershell
node scripts/put-secrets-from-file.mjs "d:\001-Klirline INC\Moncash API\API mONCASH.txt"
```

### USDT

Option A — NOWPayments :

```powershell
npx wrangler secret put NOWPAYMENTS_API_KEY
```

IPN : `https://klirline.io/api/webhooks/nowpayments`

Option B — portefeuille manuel :

```powershell
npx wrangler secret put USDT_WALLET_ADDRESS
```

Migration D1 :

```powershell
npm run db:migrate:remote
```

## Agent n8n

L'agent draft **Klir IA** est configuré dans n8n avec :
- Instructions = identité Klir IA + skill-router
- Custom tool `fetch_klir_skill` → GET https://klirline.io/api/skills/:name

**Ne pas publier** sans confirmation explicite.

## Plugin Cursor

```powershell
node scripts/sync-plugin.mjs
```

Plugin : `~/.cursor/plugins/local/klir-ia/`
