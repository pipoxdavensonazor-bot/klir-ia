# Klir IA

Assistant marketing Klirline — plugin Cursor, chat web (klirline.io), agent n8n.

## Structure

```
catalog/           # Source de vérité (identity, skills, product-marketing)
scripts/           # generate-skills.mjs, sync-plugin.mjs
src/               # App Next.js (chat klirline.io)
```

## Setup

```bash
npm install
cp .env.example .env
npm run generate-skills
npm run dev
```

Ouvrir http://localhost:3000

## Plugin Cursor

```bash
npm run sync-plugin
```

Plugin installé dans `~/.cursor/plugins/local/klir-ia/`

## Deploy Cloudflare

```bash
npm run deploy
```

Puis configurer DNS klirline.io → Worker klir-ia.

## API

- `GET /api/skills` — liste des skills
- `GET /api/skills/:name` — détail d'un skill
- `POST /api/chat` — chat `{ messages, skill? }`

## Skills

53 skills : 3 exclusifs Klir + 50 marketing adaptés.

Générer/regénérer : `npm run generate-skills`
