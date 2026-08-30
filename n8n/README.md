# Agent n8n Klir IA

**Statut :** Brouillon (non publié)  
**URL éditeur :** https://klirline.app.n8n.cloud/projects/LiHOvWVYD0jZZWNG/agents/SrOtsGvMD3XOIgha  
**Agent ID :** `SrOtsGvMD3XOIgha`

## Configuration

- **Modèle :** `openai/gpt-4o-mini`
- **Instructions :** identité Klir IA + routage skills + fetch_klir_skill
- **Custom tool :** `fetch_klir_skill` → GET https://klirline.io/api/skills/{name}
- **Branding :** gradient #004F6E → #D4AF37, icône sparkles

## Action requise (credential)

L'agent n'est pas encore runnable : **credential OpenAI manquant**.

Dans l'éditeur n8n :
1. Ouvrir l'agent Klir IA
2. Sélectionner le modèle GPT-4o mini
3. Attacher votre credential OpenAI
4. Valider et tester en Preview chat

## Publier

Ne pas publier sans confirmation explicite. Le plan v1 laisse l'agent en brouillon.

## Skills n8n sidecar

Skills à ajouter dans n8n (ou via mutate_agent) :
- Skill Router
- Humaniser
- Klirline Produits

Le catalogue complet (~92 skills) est servi via l'API klirline.io.
