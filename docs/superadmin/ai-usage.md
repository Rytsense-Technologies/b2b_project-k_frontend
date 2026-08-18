# Module: AI Usage

Frontend: `/superadmin/ai-usage`

Track tokens/requests/cost per **module** and **college**.

Modules: `Self Learning` | `Q&A` | `Interview` | `AI Skill Course`

## `GET /api/v1/superadmin/ai-usage`

Query: `search` (college or module), `module`, `period` (`this_month` | `last_month`), `page`, `limit`

```json
{
  "success": true,
  "data": [
    {
      "module": "Q&A",
      "college": "ABC Engineering",
      "college_id": "uuid",
      "requests": "12402",
      "tokens": "4.8M",
      "tokens_raw": 4800000,
      "cost": "₹18240",
      "cost_inr": 18240,
      "limit": "Normal",
      "limitType": "ok"
    }
  ]
}
```

`limit` / `limitType`:

- `Normal` / `ok` — under 80% of college monthly quota
- `Watch` / `warn` — 80–100%
- `Exceeded` / `off` — over quota

## `GET /api/v1/superadmin/ai-usage/export`

Same filters. CSV: `Module,College,Requests,Token Usage,Estimated Cost,Limit Status`

## Metering

Write a usage event on every LLM call:

`ai_usage_events (id, college_id, module, requests, prompt_tokens, completion_tokens, cost_inr, created_at)`

Aggregate by month for this API. Keep a `college_ai_quotas` table (`monthly_token_limit`, `monthly_cost_limit_inr`).
