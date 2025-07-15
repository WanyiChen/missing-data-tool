# Missing Data Tool

A web application for exploring patterns of missing data in datasets. Built with React (Vite, Tailwind CSS, Material UI), FastAPI, and Python data science libraries.

---

## Quick Start: Development Setup

### 1. Clone the Repository

```bash
git clone <repo-url>
cd missing-data-tool
```

---

### 2. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
# Activate the virtual environment:
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate
pip install -r requirements.txt
python run.py
```
- The backend will run at `http://localhost:8000` by default.

You can also run the backend directly with Uvicorn if you prefer:

```bash
uvicorn main:app --reload
```

---

### 3. Frontend Setup (Vite + React + Tailwind)

```bash
cd ../frontend
npm install
npm run dev
```
- The frontend will run at `http://localhost:5173` by default.

---

### 4. Local API Proxy

The Vite dev server is configured to proxy `/api` requests to the FastAPI backend. No extra setup is needed. If you change backend ports, update `vite.config.ts` accordingly.

---

### 5. Usage
- Open [http://localhost:5173](http://localhost:5173) in your browser.
- Upload a CSV, XLS, or XLSX file to test the tool.

---