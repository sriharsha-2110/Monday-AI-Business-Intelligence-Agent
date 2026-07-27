# Monday.com Business Intelligence Agent (monday-bi-agent)

A production-ready, executive-level AI Business Intelligence Agent designed for founders and leadership teams. It connects directly to **monday.com** boards (Deals & Work Orders) via the GraphQL v2 API, automatically cleans operational and financial data, calculates key metrics in Python, and utilizes OpenAI's GPT models to answer strategic questions and compile board-ready Leadership Reports.

## 🚀 Key Features

* **Founder Cockpit Chat UI**: A sleek, dark-themed dashboard with glassmorphism panels, suggested business questions, responsive sidebar, and dynamic micro-animations.
* **Automated Data Cleaning Engine**: Standardizes currency formats, standardizes dates of multiple styles (ISO, US, UK, text) to `YYYY-MM-DD`, strips whitespace, corrects text cases, maps columns dynamically, and deduplicates customer names.
* **Exact Python Metrics Calculations**: Pre-computes financial KPIs (Win Rates, Average Deal Sizes, Pipeline totals, Completion Rates) on the server to prevent standard LLM arithmetic errors.
* **Executive Leadership Reports**: Generates formal, board-ready markdown summaries highlighting revenue, pipeline, operations, bottlenecks, and recommendations. Includes a one-click download option.
* **Board Diagnostics Sidebar**: Displays real-time Monday connection diagnostics, item counts, and any active data hygiene warning alerts in a collapsible container.
* **Docker & Render Ready**: Includes full local configurations for Docker Compose and a `render.yaml` blueprint file for zero-configuration deployments.

---

## 📂 Project Structure

```
monday-bi-agent/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers & endpoints
│   │   ├── core/         # Settings & configuration schema
│   │   ├── services/     # Monday GraphQL clients, Cleaning engine, OpenAI services
│   │   └── prompts/      # Core strategic BI system instructions
│   ├── tests/            # pytest suite (cleaning & business calculations)
│   ├── main.py           # App entrypoint & health checks
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Python 3.12 Backend container
├── frontend/
│   ├── app/              # Next.js page routing & layout
│   ├── components/       # Chat cockpit, sidebars, leadership screens
│   ├── package.json      # Frontend package configuration
│   ├── next.config.ts    # Static export settings
│   └── Dockerfile        # Static Nginx-served client container
├── docs/
│   ├── Architecture.md   # Architectural sequence & block diagrams
│   └── DecisionLog.md    # Detail on assumptions & engineering trade-offs
├── docker-compose.yml    # Orchestrates local container environments
├── render.yaml           # Deployment configuration blueprint for Render
├── README.md             # This document
├── LICENSE               # MIT license file
└── .env.example          # Environment variables template
```

---

## 🛠️ Monday.com Configuration Setup

To configure your monday.com workspace:

1. **Import Board Templates**:
   * Create two boards: one named **Deals** (Sales Pipeline) and one named **Work Orders** (Operations).
   * You can upload your data from CSV or create items manually.
2. **Deals Board Columns**:
   * **Revenue/Value**: Numeric/Numbers column representing deal amount (e.g. `Revenue` or `Deal Value`).
   * **Stage**: Status column containing options like `Lead`, `Proposal`, `Negotiation`, `Won` / `Closed Won`, `Lost` / `Closed Lost`.
   * **Close Date**: Date column representing target closure.
   * **Sector**: Text/Status column representing industry (e.g., `Energy`, `Tech`, `Finance`).
   * **Customer**: Text column (or the item name) representing client name.
3. **Work Orders Board Columns**:
   * **Status**: Status column containing options like `Working on it`, `Stuck`, `Done`, `Delayed`.
   * **Due Date**: Date column representing deadlines.
   * **Priority**: Status or text column representing priority (`Low`, `Normal`, `High`, `Critical`).
   * **Customer**: Text column representing the client company name.
4. **Acquire Credentials**:
   * Go to **monday.com avatar** > **Administration** > **API**.
   * Copy your **Personal API Token** (this will be `MONDAY_API_KEY`).
   * Open each board in the browser and copy the numeric ID from the URL (e.g., `https://workspace.monday.com/boards/1234567890` -> Board ID is `1234567890`).

---

## 💻 Local Development

### 1. Environment Variables
Create a `.env` file in the root directory:
```bash
MONDAY_API_KEY=your_monday_personal_api_token
DEALS_BOARD_ID=your_deals_board_id_numeric
WORK_ORDER_BOARD_ID=your_work_orders_board_id_numeric
OPENAI_API_KEY=sk-proj-your_openai_api_key
PORT=8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Running Backend (FastAPI)
```bash
cd backend
# Create virtual environment
python -m venv .venv
# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```
API docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)
Health endpoint: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Running Frontend (Next.js)
Open a new terminal window:
```bash
cd frontend
# Install package dependencies
npm install
# Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the cockpit dashboard.

### 4. Running Backend Tests
Ensure your virtual environment is active, then run:
```bash
cd backend
python -m pytest tests/
```

---

## 🐳 Docker Deployment (Local Compose)

Ensure you have Docker and Docker Compose installed. Fill out the `.env` file in the root, then run:
```bash
docker-compose up --build
```
This command builds the backend container running FastAPI (Port 8000) and the frontend container running Nginx serving the Next.js static site (Port 3000).

---

## ☁️ Deploying to Render

This project is configured for deployment using Render's Infrastructure-as-Code Blueprint (`render.yaml`).

### Steps to Deploy:
1. Push this repository to **GitHub**.
2. Go to **Render Dashboard** > **Blueprints** > **New Blueprint Instance**.
3. Select your GitHub repository.
4. Render will read `render.yaml` and configure:
   * **monday-bi-agent-backend** (FastAPI Web Service)
   * **monday-bi-agent-frontend** (Next.js Static Site)
5. Under Environment variables, enter your credentials:
   * `MONDAY_API_KEY`
   * `OPENAI_API_KEY`
   * `DEALS_BOARD_ID`
   * `WORK_ORDER_BOARD_ID`
6. Click **Approve**. Render will build and deploy both services automatically.

---

## 🩺 Troubleshooting

* **ModuleNotFoundError / ImportErrors**: Make sure to run pytest using `python -m pytest tests/` from the `backend/` directory to ensure Python includes local folders in `sys.path`.
* **Board Diagnostics show connection errors**: Verify that the API Key is correct and that the user account has access to the specified Board IDs. Check if the IDs are pure numeric strings.
* **Warnings about missing columns**: Make sure your Deals and Work Orders board columns match standard naming conventions (e.g. deals having a column with "Revenue" or "Value" in the title). The agent matches columns dynamically by searching titles.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](file:///C:/Users/sriha/.gemini/antigravity/scratch/monday-bi-agent/LICENSE) file for details.
