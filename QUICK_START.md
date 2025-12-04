# Quick Start Guide

Get Qubix CRM running in 5 minutes!

## Prerequisites Check

✅ **Node.js** installed? Run: `node --version` (should be v18+)  
✅ **PostgreSQL** installed and running? Check Services (`services.msc`)  
✅ **Database created?** Run: `"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "\l"` and look for `qubix_crm`

## Quick Setup

```bash
# 1. Clone and install
git clone <repository-url>
cd qubix-crm
npm install

# 2. Set up environment
cp env.example .env
# Edit .env and set your DATABASE_URL and JWT_SECRET

# 3. Create database (if not exists)
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE qubix_crm;"

# 4. Run migrations
cd packages/database
npx prisma migrate deploy
npx prisma generate
cd ../..

# 5. Start the app (2 terminals)

# Terminal 1 - Backend
npm run start:dev --workspace=@qubix/api

# Terminal 2 - Frontend
npm run dev --workspace=@qubix/web

# 6. Open browser
# Go to: http://localhost:3000
```

## First User

1. Go to http://localhost:3000
2. Click "Register here"
3. Create account with role: **ADMIN**
4. Start using the app!

---

**Need more details?** See [README.md](./README.md) for complete documentation.

