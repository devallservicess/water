import os
import tempfile
import pytest
from app import app
from models.db import get_conn, exec_sql, DB_PATH
import models.db
from pathlib import Path
from seed import SCHEMA

# Modify the DB_PATH for tests
@pytest.fixture(scope='session', autouse=True)
def setup_test_db():
    db_fd, db_path = tempfile.mkstemp()
    # Mock models.db.DB_PATH
    original_path = models.db.DB_PATH
    models.db.DB_PATH = Path(db_path)
    
    # Init schema
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        conn.commit()

        # Seed minimal data
        conn.execute("INSERT INTO rules_config(min_rest_hours, max_daily_hours, max_weekly_hours) VALUES (11,8,40)")
        for s in ["Délivrance", "Caisse", "Stock", "Conseil", "Management"]:
            conn.execute("INSERT INTO skills(name) VALUES (?)", (s,))
        
        conn.execute("INSERT INTO employees(fullname, role, weekly_hours) VALUES (?,?,?)", ("Sara B.", "Pharmacien", 40))
        conn.commit()

    yield db_path

    # Cleanup
    models.db.DB_PATH = original_path
    os.close(db_fd)
    try:
        os.unlink(db_path)
    except PermissionError:
        pass

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_dashboard(client):
    rv = client.get('/api/dashboard')
    assert rv.status_code == 200

def test_api_employees(client):
    rv = client.post('/api/employees', json={"fullname": "Test User", "role": "Test Role"})
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert json_data["ok"] == True
    assert "id" in json_data

def test_api_chat(client):
    # Test planning generation intent
    rv = client.post('/api/chat', json={"message": "génère un planning"})
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert json_data["ok"] == True
    assert "✅ Planning généré" in json_data["answer"]

def test_agent_intent_parsing():
    from services.agent import parse_intent
    intent, args = parse_intent("génère planning")
    assert intent == "generate_planning"

    intent, args = parse_intent("qui est dispo le 2026-03-05")
    assert intent == "who_is_available"
    assert args["date"] == "2026-03-05"

    intent, args = parse_intent("ajoute absence 2 2026-03-05 2026-03-06")
    assert intent == "request_absence"
    assert args["employee_id"] == 2
    assert args["start"] == "2026-03-05"
    assert args["end"] == "2026-03-06"
