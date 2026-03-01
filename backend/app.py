from flask import Flask, jsonify, request
from flask_cors import CORS
from models.db import q_all, q_one, exec_sql
from services.scheduler import generate_week_schedule, week_bounds
from services.demand_forecast import demand_alerts_for_date
from services.agent import handle_message

app = Flask(__name__)
CORS(app)

def get_current_week_start():
    # Monday of current week based on sqlite now
    row = q_one("SELECT date('now', 'weekday 1', '-7 days') AS ws")
    return row["ws"]

@app.get("/api/dashboard")
def dashboard():
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

    # Convert mapping rows to dicts
    coverage_list = [dict(c) for c in coverage]

    return jsonify({
        "week_start": week_start,
        "week_end": week_end,
        "total_employees": total_employees,
        "pending_absences": pending_absences,
        "approved_absences": approved_absences,
        "today": today,
        "alerts": alerts,
        "coverage": coverage_list
    })

@app.get("/api/employees/all")
def employees_page():
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

@app.get("/api/planning/all")
def planning_page():
    # ✅ IMPORTANT: default = current week (pas une date fixe)
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
        # SQLite Row does not serialize simply
        ass_map.setdefault(r["shift_id"], []).append(dict(r))

    return jsonify({
        "week_start": week_start,
        "week_end": week_end,
        "shifts": [dict(s) for s in shifts],
        "ass_map": ass_map
    })

@app.get("/api/absences/all")
def absences_page():
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

# ---------------- API ----------------

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

@app.post("/api/planning/generate")
def api_generate_planning():
    data = request.get_json(force=True)
    week_start = (data.get("week_start") or "").strip()
    if not week_start:
        return jsonify({"ok": False, "error": "week_start obligatoire"}), 400

    res = generate_week_schedule(week_start)
    return jsonify(res)

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

@app.post("/api/chat")
def api_chat():
    data = request.get_json(force=True)
    msg = (data.get("message") or "").strip()
    if not msg:
        return jsonify({"ok": False, "answer": "Écris un message."}), 400
    answer = handle_message(msg)
    return jsonify({"ok": True, "answer": answer})

if __name__ == "__main__":
    app.run(debug=True)