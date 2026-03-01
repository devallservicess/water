import os
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from models.db import q_all, q_one, exec_sql
from services.scheduler import generate_week_schedule, week_bounds
from services.demand_forecast import demand_alerts_for_date
from services.agent import handle_message

app = Flask(__name__)
CORS(app)

# ── Request Logging ─────────────────────────────────
@app.before_request
def log_request():
    from datetime import datetime
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"{ts} {request.method} {request.path}", flush=True)

# ── Health Check ────────────────────────────────────
@app.get("/api/health")
def health():
    return jsonify({
        "status": "healthy",
        "version": "2.0",
        "ai_model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "endpoints": ["/api/dashboard", "/api/employees/all", "/api/planning/all",
                      "/api/absences/all", "/api/chat", "/api/analytics", "/api/health"]
    })

def get_current_week_start():
    row = q_one("SELECT date('now', 'weekday 1', '-7 days') AS ws")
    return row["ws"]

# ── Dashboard ───────────────────────────────────────
@app.get("/api/dashboard")
def dashboard():
    try:
        week_start = request.args.get("week", get_current_week_start())
        week_start, week_end = week_bounds(week_start)

        total_employees = q_one("SELECT COUNT(*) AS c FROM employees WHERE active=1")["c"]
        pending_absences = q_one("SELECT COUNT(*) AS c FROM absences WHERE status='pending'")["c"]
        approved_absences = q_one("SELECT COUNT(*) AS c FROM absences WHERE status='approved'")["c"]

        today = q_one("SELECT date('now') AS d")["d"]
        alerts = demand_alerts_for_date(today)

        coverage = q_all("""
            SELECT s.id, s.date, s.start_time, s.end_time, s.min_staff,
                   (SELECT COUNT(*) FROM assignments a WHERE a.shift_id=s.id) AS assigned
            FROM shifts s
            WHERE date(s.date)=date(?)
            ORDER BY s.start_time
        """, (today,))

        # Weekly coverage for charts
        week_coverage = q_all("""
            SELECT s.date,
                   SUM(s.min_staff) AS total_required,
                   (SELECT COUNT(*) FROM assignments a WHERE a.shift_id IN
                       (SELECT id FROM shifts WHERE date=s.date)) AS total_assigned
            FROM shifts s
            WHERE date(s.date) BETWEEN date(?) AND date(?)
            GROUP BY s.date
            ORDER BY s.date
        """, (week_start, week_end))

        # Role distribution
        role_dist = q_all("""
            SELECT role, COUNT(*) AS count FROM employees WHERE active=1 GROUP BY role
        """)

        return jsonify({
            "week_start": week_start,
            "week_end": week_end,
            "total_employees": total_employees,
            "pending_absences": pending_absences,
            "approved_absences": approved_absences,
            "today": today,
            "alerts": alerts,
            "coverage": [dict(c) for c in coverage],
            "week_coverage": [dict(w) for w in week_coverage],
            "role_distribution": [dict(r) for r in role_dist],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Employees ───────────────────────────────────────
@app.get("/api/employees/all")
def employees_page():
    try:
        employees = q_all("SELECT * FROM employees ORDER BY active DESC, fullname")
        skills = q_all("SELECT * FROM skills ORDER BY name")
        emp_skills = q_all("""
            SELECT es.employee_id, s.name, es.level
            FROM employee_skills es
            JOIN skills s ON s.id = es.skill_id
        """)
        map_es = {}
        for r in emp_skills:
            map_es.setdefault(r["employee_id"], {})[r["name"]] = r["level"]

        return jsonify({
            "employees": [dict(e) for e in employees],
            "skills": [dict(s) for s in skills],
            "emp_skills": map_es
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/employees")
def api_add_employee():
    data = request.get_json(force=True)
    fullname = (data.get("fullname") or "").strip()
    role = (data.get("role") or "").strip()
    weekly_hours = int(data.get("weekly_hours") or 40)

    if not fullname or not role:
        return jsonify({"ok": False, "error": "fullname et role obligatoires"}), 400

    emp_id = exec_sql(
        "INSERT INTO employees(fullname, role, weekly_hours) VALUES (?,?,?)",
        (fullname, role, weekly_hours)
    )
    return jsonify({"ok": True, "id": emp_id})

@app.post("/api/employees/<int:emp_id>/toggle")
def api_toggle_employee(emp_id):
    row = q_one("SELECT active FROM employees WHERE id=?", (emp_id,))
    if not row:
        return jsonify({"ok": False, "error": "not found"}), 404
    new_val = 0 if int(row["active"]) == 1 else 1
    exec_sql("UPDATE employees SET active=? WHERE id=?", (new_val, emp_id))
    return jsonify({"ok": True, "active": new_val})

@app.post("/api/employees/<int:emp_id>/skills")
def api_set_employee_skills(emp_id):
    data = request.get_json(force=True)
    skills = data.get("skills") or {}

    exec_sql("DELETE FROM employee_skills WHERE employee_id=?", (emp_id,))

    for skill_name, level in skills.items():
        srow = q_one("SELECT id FROM skills WHERE name=?", (skill_name,))
        if not srow:
            continue
        exec_sql(
            "INSERT INTO employee_skills(employee_id, skill_id, level) VALUES (?,?,?)",
            (emp_id, srow["id"], int(level))
        )
    return jsonify({"ok": True})

# ── Planning ────────────────────────────────────────
@app.get("/api/planning/all")
def planning_page():
    try:
        week_start = request.args.get("week", get_current_week_start())
        week_start, week_end = week_bounds(week_start)

        shifts = q_all("""
            SELECT * FROM shifts
            WHERE date(date) BETWEEN date(?) AND date(?)
            ORDER BY date(date), start_time
        """, (week_start, week_end))

        ass = q_all("""
            SELECT a.shift_id, e.fullname, e.role, a.status
            FROM assignments a
            JOIN employees e ON e.id = a.employee_id
            WHERE a.shift_id IN (
                SELECT id FROM shifts WHERE date(date) BETWEEN date(?) AND date(?)
            )
            ORDER BY e.fullname
        """, (week_start, week_end))

        ass_map = {}
        for r in ass:
            ass_map.setdefault(r["shift_id"], []).append(dict(r))

        return jsonify({
            "week_start": week_start,
            "week_end": week_end,
            "shifts": [dict(s) for s in shifts],
            "ass_map": ass_map
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/planning/generate")
def api_generate_planning():
    data = request.get_json(force=True)
    week_start = (data.get("week_start") or "").strip()
    if not week_start:
        return jsonify({"ok": False, "error": "week_start obligatoire"}), 400

    res = generate_week_schedule(week_start)
    return jsonify(res)

# ── Absences ────────────────────────────────────────
@app.get("/api/absences/all")
def absences_page():
    try:
        absences = q_all("""
            SELECT a.*, e.fullname, e.role
            FROM absences a
            JOIN employees e ON e.id = a.employee_id
            ORDER BY a.id DESC
        """)
        employees = q_all("SELECT id, fullname FROM employees WHERE active=1 ORDER BY fullname")
        return jsonify({
            "absences": [dict(a) for a in absences],
            "employees": [dict(e) for e in employees]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/absences/request")
def api_request_absence():
    data = request.get_json(force=True)
    employee_id = int(data.get("employee_id"))
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    reason = (data.get("reason") or "").strip()

    exec_sql("""
        INSERT INTO absences(employee_id,start_date,end_date,reason,status)
        VALUES (?,?,?,?, 'pending')
    """, (employee_id, start_date, end_date, reason))
    return jsonify({"ok": True})

@app.post("/api/absences/<int:absence_id>/approve")
def api_approve_absence(absence_id):
    exec_sql("UPDATE absences SET status='approved' WHERE id=?", (absence_id,))
    return jsonify({"ok": True})

@app.post("/api/absences/<int:absence_id>/reject")
def api_reject_absence(absence_id):
    exec_sql("UPDATE absences SET status='rejected' WHERE id=?", (absence_id,))
    return jsonify({"ok": True})

# ── Chat (AI Agent) ─────────────────────────────────
@app.post("/api/chat")
def api_chat():
    data = request.get_json(force=True)
    msg = (data.get("message") or "").strip()
    if not msg:
        return jsonify({"ok": False, "answer": "Écris un message."}), 400
    try:
        answer = handle_message(msg)
        return jsonify({"ok": True, "answer": answer})
    except Exception as e:
        return jsonify({"ok": False, "answer": f"Erreur: {str(e)}"}), 500

# ── Analytics ───────────────────────────────────────
@app.get("/api/analytics")
def analytics():
    try:
        week_start = request.args.get("week", get_current_week_start())
        week_start, week_end = week_bounds(week_start)

        # Workload per employee this week
        workload = q_all("""
            SELECT e.id, e.fullname, e.role, e.weekly_hours AS max_hours,
                   COALESCE(SUM(
                       (CAST(substr(s.end_time,1,2) AS INT)*60 + CAST(substr(s.end_time,4,2) AS INT))
                       - (CAST(substr(s.start_time,1,2) AS INT)*60 + CAST(substr(s.start_time,4,2) AS INT))
                   ) / 60.0, 0) AS assigned_hours
            FROM employees e
            LEFT JOIN assignments a ON a.employee_id = e.id AND a.status IN ('planned','confirmed')
            LEFT JOIN shifts s ON s.id = a.shift_id AND date(s.date) BETWEEN date(?) AND date(?)
            WHERE e.active = 1
            GROUP BY e.id
            ORDER BY assigned_hours DESC
        """, (week_start, week_end))

        # Skill matrix
        skill_matrix = q_all("""
            SELECT e.id AS emp_id, e.fullname, sk.name AS skill, es.level
            FROM employees e
            JOIN employee_skills es ON es.employee_id = e.id
            JOIN skills sk ON sk.id = es.skill_id
            WHERE e.active = 1
            ORDER BY e.fullname, sk.name
        """)
        matrix = {}
        for r in skill_matrix:
            matrix.setdefault(r["emp_id"], {"name": r["fullname"], "skills": {}})\
                  ["skills"][r["skill"]] = r["level"]

        # Absence frequency per employee
        absence_freq = q_all("""
            SELECT e.fullname, COUNT(a.id) AS total_absences
            FROM employees e
            LEFT JOIN absences a ON a.employee_id = e.id
            WHERE e.active = 1
            GROUP BY e.id
            ORDER BY total_absences DESC
        """)

        # All skills list
        all_skills = q_all("SELECT name FROM skills ORDER BY name")

        return jsonify({
            "week_start": week_start,
            "week_end": week_end,
            "workload": [dict(w) for w in workload],
            "skill_matrix": matrix,
            "all_skills": [s["name"] for s in all_skills],
            "absence_frequency": [dict(a) for a in absence_freq],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Error Handlers ──────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint introuvable"}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Erreur serveur interne"}), 500

if __name__ == "__main__":
    print(f"✅ Pharma RH Agent v2.0 — http://localhost:5000")
    print(f"   AI Model: {os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')}")
    print(f"   Endpoints: /api/dashboard, /api/employees, /api/planning, /api/absences, /api/chat, /api/analytics, /api/health")
    app.run(debug=True)