import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "pharma.db"

def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def q_all(sql, params=()):
    with get_conn() as conn:
        cur = conn.execute(sql, params)
        return cur.fetchall()

def q_one(sql, params=()):
    with get_conn() as conn:
        cur = conn.execute(sql, params)
        return cur.fetchone()

def exec_sql(sql, params=()):
    with get_conn() as conn:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
