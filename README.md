# Pharma RH Agent

Pharma RH Agent is a full-stack web application designed for the human resources management of a pharmacy. It features an automated scheduling engine, an intelligent NLP chatbot for managing absences and replacements, and a comprehensive dashboard for tracking employee hours, skills, and shift coverage.

The project uses a **decoupled architecture** with a Python/Flask REST API backend and a React (Vite) frontend.

## Features

-   **Dashboard:** View the current week's summary including total active employees, pending/approved absences, and daily shift coverage vs. demand alerts.
-   **Employee Management:** Add employees, toggle their active status, assign specific roles (Pharmacien, Préparateur, Caissier, etc.), and manage their skills and skill levels.
-   **Automated Planning Generator:** Automatically generates a weekly schedule assigning eligible employees to shifts based on their skills, availability, maximum hours, and rest period rules (e.g., minimum 11 hours rest between shifts). If no shifts are defined for the week, default morning/evening shifts are created automatically.
-   **Absence Management:** Employees can request absences, which managers can then approve or reject.
-   **NLP Agent Chatbot:** A built-in chat interface that understands natural language queries. Employees or managers can ask the agent to:
    -   Generate the planning for the week (e.g., *"Génère le planning"*).
    -   Check who is available on a specific date (e.g., *"Qui est dispo le 2026-03-05"*).
    -   Request an absence (e.g., *"Ajoute absence 2 2026-03-05 2026-03-06"*).
    -   Suggest replacements for an approved absence (e.g., *"Remplacement 1"*).

## Architecture

-   **Backend:** Python 3.9+ / Flask — A pure JSON REST API.
-   **Frontend:** React 19 / Vite — A single-page application using React Router, Axios, Tailwind CSS, and Lucide icons.
-   **Database:** SQLite via custom wrapper functions (`backend/models/db.py`).

### Directory Structure

```plaintext
pharma-rh-agent-main/
├── backend/                        # Flask REST API
│   ├── app.py                      # Main Flask application and API routes
│   ├── seed.py                     # Script to initialize and seed the SQLite database
│   ├── requirements.txt            # Python package dependencies
│   ├── data/                       # Contains the SQLite database file (pharma.db)
│   ├── models/
│   │   └── db.py                   # Database connection and query utilities
│   ├── services/                   # Business logic
│   │   ├── agent.py                # NLP intent parsing and chat responses
│   │   ├── demand_forecast.py      # Logic for predicting busy periods (alerts)
│   │   ├── rules.py                # HR rules validation (rest hours, max hours, absences)
│   │   └── scheduler.py            # Automated weekly schedule generation logic
│   └── tests/                      # Automated test suite (pytest)
│       └── test_app.py
│
├── frontend/                       # React (Vite) SPA
│   ├── package.json                # Node.js dependencies and scripts
│   ├── vite.config.js              # Vite configuration
│   └── src/
│       ├── main.jsx                # Application entry point
│       ├── App.jsx                 # Root component with routing and sidebar
│       ├── api.js                  # Axios API client (connects to backend)
│       ├── index.css               # Global styles
│       └── pages/                  # Page components
│           ├── Dashboard.jsx       # Dashboard view
│           ├── Employees.jsx       # Employee management view
│           ├── Planning.jsx        # Weekly planning view
│           ├── Absences.jsx        # Absence management view
│           └── Chat.jsx            # NLP agent chatbot view
│
└── README.md
```

## Setup & Installation

Follow these steps to set up and run the Pharma RH Agent locally.

### Prerequisites

-   Python 3.9+
-   Node.js 18+ and npm

### 1. Clone the Repository

```powershell
git clone https://github.com/your-username/pharma-rh-agent-main.git
cd pharma-rh-agent-main
```

### 2. Backend Setup

```powershell
# Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install Python dependencies
cd backend
pip install -r requirements.txt

# Initialize the database with schema and demo data
python seed.py
```

### 3. Frontend Setup

```powershell
# In a new terminal, navigate to the frontend directory
cd frontend

# Install Node.js dependencies
npm install
```

### 4. Run the Application

You need **two terminals** to run both servers simultaneously.

**Terminal 1 — Backend (Flask API on port 5000):**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python app.py
```

**Terminal 2 — Frontend (Vite dev server on port 5173):**
```powershell
cd frontend
npm run dev
```

Open your browser and navigate to `http://localhost:5173` to use the application.

## Testing

### Backend Tests

The backend includes an automated test suite using `pytest`. Tests cover API endpoints, NLP agent intent extraction, and database logic using an isolated temporary database.

```powershell
cd backend
pip install pytest pytest-flask
python -m pytest tests/test_app.py -v
```

### Frontend Linting

The frontend uses ESLint for code quality checks.

```powershell
cd frontend
npm run lint
```
