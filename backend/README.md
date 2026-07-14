# Aivoa CRM - Backend API Server

This directory contains the FastAPI server, database schema, and LangGraph agent workflow for the **Aivoa CRM HCP Module**.

For the full project documentation including system architecture diagrams, database schema, data flow sequences, and full-stack setup instructions, please see the main [root README.md](file:///c:/aivoa/README.md).

## Quick Start

1. Set up a Python virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Mac/Linux:
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Seed the SQLite database (`crm.db`):
   ```bash
   python seed.py
   ```

4. Run the FastAPI development server:
   ```bash
   python main.py
   ```

5. The API server will be available at `http://127.0.0.1:8000`. You can view interactive Swagger docs at `http://127.0.0.1:8000/docs`.

## Integration Tests

To run the verification suite against the active API server, run:
```bash
python verify_backend.py
```
