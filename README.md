
## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.18.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - Comes with Node.js
- **PostgreSQL** (v17 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

### Verify Installation

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PostgreSQL (Windows)
# Open Services (services.msc) and verify PostgreSQL service is running
```

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd qubix-crm
```

### 2. Install Dependencies

```bash
npm install
```

This will install all dependencies for the monorepo, including:
- Backend API (NestJS)
- Frontend Web App (Next.js)
- Shared packages
- Database package (Prisma)

**Note:** This may take 2-5 minutes depending on your internet connection.

### 3. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
# Copy the example file
cp env.example .env
```

Edit `.env` and update the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/qubix_crm"

# JWT Secrets (generate secure random strings)
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"

# Application URLs
BASE_URL="http://localhost:3000"
API_URL="http://localhost:4000"
```

**Important:** Replace `YOUR_PASSWORD` with your PostgreSQL password and generate secure JWT secrets.

### 4. Set Up PostgreSQL Database

#### Create the Database

**Option 1: Using Command Prompt (Recommended)**

```bash
# For PostgreSQL 18
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE qubix_crm;"

# For PostgreSQL 17
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE qubix_crm;"
```

You'll be prompted to enter your PostgreSQL password.

**Option 2: Using pgAdmin**

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Name it `qubix_crm`
5. Click "Save"

#### Run Database Migrations

```bash
# Navigate to database package
cd packages/database

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Return to root
cd ../..
```

## 🏃 Running the Application

The application consists of two parts that need to run simultaneously:
1. **Backend API** (NestJS) - Runs on `http://localhost:4000`
2. **Frontend Web App** (Next.js) - Runs on `http://localhost:3000`

### Option 1: Run in Separate Terminals (Recommended)

**Terminal 1 - Backend:**

```bash
npm run start:dev --workspace=@qubix/api
```

Wait until you see:
```
🚀 API ready on http://localhost:4000/api
```

**Terminal 2 - Frontend:**

Open a new terminal window and run:

```bash
npm run dev --workspace=@qubix/web
```

Wait until you see:
```
Local:        http://localhost:3000
```

### Option 2: Use the Batch Script (Windows)

```bash
start-localhost.bat
```

This will automatically:
- Start the backend in one terminal
- Start the frontend in another terminal
- Open your browser after 15 seconds

### Access the Application

1. Open your web browser
2. Navigate to: **http://localhost:3000**
3. You should see the Qubix CRM login page

### First Time Setup

1. Click **"Register here"** or navigate to `/register`
2. Fill in your details:
   - First Name
   - Last Name
   - Email
   - Password
   - Role: Select **ADMIN** for full access
3. Click **Create Account**
4. You'll be automatically logged in!

## 📁 Project Structure

```
qubix-crm/
├── apps/
│   ├── api/                 # NestJS Backend API
│   │   ├── src/
│   │   │   ├── modules/    # Feature modules (auth, attendance, leave, etc.)
│   │   │   ├── database/   # Prisma service
│   │   │   └── main.ts     # Application entry point
│   │   └── package.json
│   └── web/                # Next.js Frontend
│       ├── src/
│       │   ├── app/        # Next.js app router pages
│       │   ├── components/ # React components
│       │   └── lib/        # Utilities and API client
│       └── package.json
├── packages/
│   ├── database/           # Prisma schema and migrations
│   │   └── prisma/
│   │       └── schema.prisma
│   └── shared/             # Shared types and utilities
├── .env                    # Environment variables (not in git)
├── .gitignore              # Git ignore rules
├── package.json            # Root package.json (monorepo config)
└── README.md               # This file
```

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/qubix_crm"

# JWT Authentication
JWT_SECRET="your-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"

# Application URLs
BASE_URL="http://localhost:3000"
API_URL="http://localhost:4000"

# Email Configuration (Optional)
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@example.com"
EMAIL_PASSWORD="your-password"
EMAIL_FROM="noreply@example.com"

# Storage
STORAGE_ROOT="./storage"
```

## 🗄️ Database Setup

### Prisma Commands

```bash
# Navigate to database package
cd packages/database

# View database in Prisma Studio (GUI)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```


