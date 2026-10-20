# AI Interview RAG

AI Interview RAG is a full-stack technical interview platform that uses resume-grounded retrieval, adaptive interview conversations, AI evaluation, Clerk authentication, and user-specific interview history.

> **Security first:** This repository intentionally contains placeholders, not working credentials. Configure your own provider accounts and local secrets before running the app. Never commit `.env` files, API keys, database passwords, or private tokens.

## Features

### Feature 1 — Resume-Based Technical Interview
- Upload and validate a PDF resume.
- Extract and analyze resume content.
- Chunk and embed resume text for retrieval through Qdrant.
- Generate role-relevant technical questions grounded in resume evidence.
- Evaluate candidate answers and present a final report.

### Feature 2 — Adaptive AI Interview
- Structured technical interview flow with interview state and planned questions.
- Conversational interview with follow-up questions informed by previous answers, target role, resume context, and time remaining.
- Final evaluation and report.

### Feature 3 — Voice Interview
- Voice-first interface for the conversational interview.
- Browser speech recognition for speech-to-text and browser speech synthesis for text-to-speech where supported.
- Recognized speech is placed in the message input so the candidate can review/edit it and explicitly send it.
- Uses the existing interview backend and evaluation flow; browser speech API support varies by browser and operating system.

### Authentication and history
- Clerk handles sign-in and protected frontend routes.
- FastAPI verifies authenticated requests.
- Interview transcripts and evaluations are stored in Neon PostgreSQL and scoped to the signed-in Clerk user.
- History includes controls to review and delete a user's own interview records.

## Architecture

```text
Browser frontend (HTML, CSS, vanilla JavaScript)
                 |
                 v
         FastAPI backend
          /     |      \
         v      v       v
    OpenAI   Qdrant   Neon PostgreSQL
       ^        ^          ^
       |        |          |
 resume parsing, embeddings, interview generation/evaluation, history
```

## Technology stack

- **Frontend:** HTML, CSS, vanilla JavaScript, Clerk JavaScript SDK, Web Speech APIs (browser-dependent)
- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic, PyMuPDF, OpenAI Python SDK, Qdrant client, Clerk Backend SDK, `python-dotenv`
- **Database:** Neon PostgreSQL
- **Vector search:** Qdrant
- **AI:** OpenAI models for resume analysis, embeddings, interview generation, and evaluation

## Repository structure

```text
ai-interview-rag-v4/
├── backend/
│   ├── app/
│   │   ├── analyzer/          # Resume/profile analysis
│   │   ├── history/           # Authenticated history API
│   │   ├── interview/         # Feature 1 interview flow and evaluation
│   │   │   └── chat/           # Adaptive conversational interview
│   │   ├── rag/               # Resume chunking, embeddings, Qdrant retrieval
│   │   ├── resume/            # PDF validation and resume processing
│   │   ├── auth.py            # Clerk request authentication
│   │   ├── database.py        # SQLAlchemy database setup
│   │   ├── main.py            # FastAPI application and routers
│   │   └── models.py          # Database models
│   ├── .env.example           # Safe local configuration template
│   └── requirements.txt
├── frontend/
│   ├── chat/                  # Feature 2 adaptive interview pages
│   ├── interview/             # Feature 1 pages
│   ├── voice/                 # Feature 3 voice interview pages
│   ├── auth.js                # Clerk initialization and route protection
│   ├── history.html           # Interview history page
│   ├── history.js
│   ├── index.html             # Home page
│   └── ...                    # Shared scripts and styles
├── .gitignore
└── README.md
```

## Prerequisites

Install these before setup:
- Python 3.11 or a compatible version supported by the pinned dependencies
- Git
- A Clerk application
- An OpenAI API key
- A Qdrant cluster and API key
- A Neon PostgreSQL database

## Configuration

### 1. Backend environment file

From the repository root, copy the example file:

**Git Bash / macOS / Linux**

```bash
cp backend/.env.example backend/.env
```

**Windows PowerShell**

```powershell
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env` and replace every `YOUR_...` placeholder with values from your own services.

| Variable | Where to get it | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API dashboard | Authenticates AI and embedding requests |
| `OPENAI_MODEL` | Choose a model available to your account | Interview generation and evaluation |
| `OPENAI_EMBEDDING_MODEL` | Choose a supported embedding model | Resume and query embeddings; dimensions must be compatible with the Qdrant collection |
| `QDRANT_URL` | Qdrant cluster dashboard | Qdrant endpoint URL |
| `QDRANT_API_KEY` | Qdrant cluster dashboard | Authenticates Qdrant requests |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API keys | Server-side Clerk authentication; keep secret |
| `CLERK_JWT_KEY` | Clerk Dashboard → JWT/verification configuration for your application | Public verification key expected by the installed Clerk SDK; preserve PEM newlines as `\n` in `.env` if needed |
| `CLERK_AUTHORIZED_PARTIES` | Your local frontend origins and deployed frontend origin | Comma-separated origins accepted by backend auth validation |
| `DATABASE_URL` | Neon Dashboard → Connect | PostgreSQL connection string; use a pooled or direct connection supported by your setup |

Do not commit `backend/.env`. Only commit `backend/.env.example`, which contains placeholders.

### 2. Frontend Clerk configuration

The frontend is a static site, so it cannot read `backend/.env` directly. Before running it, replace these placeholders in the frontend HTML files and `frontend/auth.js` with the values for **your own Clerk application**:

- `YOUR_CLERK_PUBLISHABLE_KEY` — Clerk Dashboard → API keys. A publishable key is designed for browser use, but it is still project-specific configuration.
- `YOUR_CLERK_FRONTEND_API_DOMAIN` — the frontend API/domain shown by Clerk for that application, without `https://`.

The HTML files use both the publishable-key value and the Clerk browser SDK script URL. Update all occurrences consistently. Never put `CLERK_SECRET_KEY`, database credentials, OpenAI keys, or Qdrant keys in frontend code.

### 3. Clerk redirect and origin configuration

In the Clerk Dashboard, configure local development URLs to match the frontend URL you use. The default commands below serve the frontend at `http://127.0.0.1:3000`; `http://localhost:3000` is also included in the example. If you use another host or port, update the Clerk settings, `CLERK_AUTHORIZED_PARTIES`, and backend CORS allowlist in `backend/app/main.py` to match. For deployment, configure the deployed origin too.

## Local development

### 1. Create and activate a Python virtual environment

**Git Bash**

```bash
python -m venv backend/venv
source backend/venv/Scripts/activate
```

**Windows PowerShell**

```powershell
python -m venv backend/venv
.\backend\venv\Scripts\Activate.ps1
```

**macOS / Linux**

```bash
python -m venv backend/venv
source backend/venv/bin/activate
```

### 2. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Start the backend

From the repository root, with the virtual environment active:

```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API root is `http://127.0.0.1:8000/` and the health endpoint is `http://127.0.0.1:8000/health`.

### 4. Start the frontend

Open a second terminal from the repository root:

```bash
cd frontend
python -m http.server 3000
```

Then visit `http://127.0.0.1:3000`. Use a supported browser for the voice feature; speech recognition support and network requirements differ between browsers.

## Before publishing to GitHub

1. Confirm `backend/.env` exists only locally and is ignored by Git.
2. Search the complete repository for real API keys, tokens, passwords, connection strings, private keys, and credential-bearing URLs.
3. Keep `.env.example` placeholders only.
4. Do not commit virtual environments, Python cache files, logs, local databases, or editor-specific files.
5. If any real credential has ever been committed, uploaded, or shared, **revoke/rotate it at the provider**. Removing it from the latest files does not remove it from Git history or invalidate it.
6. Use GitHub secret scanning and review the staged diff before pushing.

Example Git workflow (run only after reviewing the files):

```bash
git init
git add .
git status
git diff --cached
# Commit only after confirming no credentials or unwanted files are staged.
git commit -m "Prepare AI Interview RAG for public repository"
```

## Security notes

- `backend/.env` is intentionally excluded from the repository.
- The `.env.example` file must contain placeholder values only.
- Clerk publishable keys are intended for browser use; Clerk secret keys are not.
- Never expose OpenAI or Qdrant API keys, Clerk secret keys, database passwords, or private tokens.
- If a credential was present in a shared archive or source control, rotate it even if the file is now cleaned.
- The README and template do not contain live provider credentials.

## License

Add a license file if you intend to publish this project with an explicit open-source license.
