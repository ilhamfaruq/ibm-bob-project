# LabInsight AI

> Clinical Blood Report Intelligence Assistant — Patient-facing AI tool for educational lab result interpretation.

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy (async), Alembic |
| AI Agent | LangGraph (classify → educate → summarise) |
| OCR/Extraction | OpenAI GPT-4o Vision |
| Database | PostgreSQL 16 + pgvector |
| Auth | JWT (Bearer tokens) |
| Deployment | Vercel (frontend) + Railway (backend) |

## Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL running locally **or** Docker

### 1. Database (Docker)
```bash
docker run -d \
  --name labinsight_db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=labinsight \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env — set your OPENAI_API_KEY

python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

Tables are created automatically on first startup via SQLAlchemy.

API docs: http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### Full Stack via Docker Compose
```bash
# Copy and edit env
cp backend/.env.example backend/.env
# Set OPENAI_API_KEY in backend/.env

docker-compose up --build
```

## User Flow
1. **Register / Login** — JWT-secured accounts
2. **Upload** — Drop a PDF or image of your blood lab report
3. **AI Processing** — GPT-4o extracts parameters, LangGraph agent classifies and explains each one
4. **Results** — Color-coded parameter cards (🟢 Normal / 🟡 Slightly Abnormal / 🔴 Significant)
5. **History** — Compare past reports over time

## Project Structure
```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + lifespan
│   │   ├── config.py        # Settings (pydantic-settings)
│   │   ├── database.py      # Async SQLAlchemy engine
│   │   ├── models.py        # ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── auth.py          # JWT + password hashing
│   │   ├── ocr.py           # GPT-4o Vision extraction
│   │   ├── agent.py         # LangGraph AI agent
│   │   └── routers/
│   │       ├── auth.py      # /auth/register, /login, /me
│   │       └── reports.py   # /reports/upload, list, get, delete
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── login/       # Login page
│   │   │   ├── register/    # Register page
│   │   │   ├── dashboard/   # Dashboard + layout
│   │   │   ├── upload/      # File upload page
│   │   │   ├── history/     # Report history
│   │   │   └── reports/[id] # Report detail with highlights
│   │   ├── context/         # AuthContext
│   │   ├── lib/api.ts       # Axios API client
│   │   └── types/index.ts   # TypeScript types
│   └── Dockerfile
└── docker-compose.yml
```

## Clinical Disclaimer
This application provides **educational information only**. It does not provide medical diagnosis. All results should be discussed with a qualified healthcare professional.

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Async PostgreSQL URL (`postgresql+asyncpg://...`) |
| `SYNC_DATABASE_URL` | Sync PostgreSQL URL (for Alembic) |
| `SECRET_KEY` | JWT signing key |
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o required) |
| `UPLOAD_DIR` | Local file upload directory |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
