# Project K — B2B SuperAdmin Portal

Standalone B2B tenant-management portal (colleges / institutions).  
Runs on a **separate domain** from the B2C interview product.

## Login

- URL: `/auth/login`
- Uses your **B2B backend** (`POST /auth/login` or `POST /superadmin/auth/login`)

## Setup

```bash
npm install
npm run dev
```

Default dev URL: http://localhost:3001 (use `dev:clean` script)

Backend API: `http://localhost:8000/api/v1` (see `src/lib/apiConfig.js`)

## Routes

| Route | Description |
|---|---|
| `/superadmin/dashboard` | Tenant overview |
| `/superadmin/tenants` | Tenant management |
| `/superadmin/users` | Cross-tenant users |
| `/superadmin/analytics` | Platform analytics |
| `/superadmin/settings` | Admin settings |

## Note

This package was split from the B2C frontend. Same UI theme, different product.
