---
type: Access Rule
title: "Switched-off and out-of-scope features"
description: "Do not rebuild these in Phase 1 unless the owner files a Change Request."
tags: [rule, scope]
status: stable
sources:
  - resource: "docs/agent/prod.md"
  - resource: "src/lib/product/interviewOff.js"
  - resource: "src/lib/product/whatsappOff.js"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# Off in product (code may still exist)
| Feature | Behaviour |
|---|---|
| AI interview | `INTERVIEWS_ENABLED=false`. Routers unmounted (**404**). No nav, screens, KPIs, report type, or mail. Data kept. Voice tutor stays. |
| WhatsApp | UI hides channel, filters, labels, health row. Lists request `channel=email`. |
| Plan / licence / upgrade | Never. Colleges use **student seat cap** only. |

# Out of SOW (ask first)
Mobile apps · offline downloads · live faculty↔student streaming · B2C Interview Portal billing · on-prem · Moodle/Canvas · Skill Courses · Email Management CRUD · AI Usage ₹ dashboard · student billing.

# Related
[How it works](/product.md) · [Interview eligibility](/flows/interview-eligibility.md)
