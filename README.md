# B2B Project K — SuperAdmin Frontend

Standalone B2B tenant-management portal for colleges and institutions.  
Runs on a **separate domain** from the B2C interview product.

## Tech stack

- Next.js 14 (App Router)
- React 18
- Redux Toolkit
- TanStack Query
- Tailwind CSS

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit values as needed
npm run dev
```

Default dev URL: http://localhost:3000  
To run on port 3001 with a clean cache: `npm run dev:clean`

Backend API (local): `http://localhost:8000/api/v1` — see `src/lib/apiConfig.js`

## Auth

- Login URL: `/auth/login`
- Backend: `POST /auth/login` or `POST /superadmin/auth/login`
- In development, login bypasses API validation until the backend is integrated. Set `NEXT_PUBLIC_DEV_BYPASS_AUTH=false` in `.env.local` to use real auth in dev.

## Routes

| Route | Description |
|---|---|
| `/superadmin/dashboard` | Tenant overview |
| `/superadmin/tenants` | Tenant management |
| `/superadmin/users` | Cross-tenant users |
| `/superadmin/analytics` | Platform analytics |
| `/superadmin/settings` | Admin settings |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run dev:clean` | Kill port 3001 and start fresh |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Repository

Maintained by [Rytsense Technologies](https://github.com/Rytsense-Technologies).
