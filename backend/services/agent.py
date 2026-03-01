import re
from models.db import q_all, q_one, exec_sql
from services.scheduler import generate_week_schedule
from services.rules import employee_is_absent

def parse_intent(text: str):
    t = text.lower().strip()

    if re.search(r"\b(génère|generer|generate)\b.*\bplanning\b", t):
        return ("generate_planning", {})

    m = re.search(r"\b(dispo|libre|available)\b.*\b(\d{4}-\d{2}-\d{2})\b", t)
    if m:
        date_str = m.group(2)
        return ("who_is_available", {"date": date_str})

    if re.search(r"\b(ajoute|add|crée|cree)\b.*\babsence\b", t):
        # expect: "absence 3 2026-03-05 2026-03-06"
        m2 = re.search(r"\babsence\b\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})", t)
        if m2:
            return ("request_absence", {"employee_id": int(m2.group(1)), "start": m2.group(2), "end": m2.group(3)})
        return ("help_absence_format", {})

    if re.search(r"\b(remplacement|replace)\b", t):
        # expect: "remplacement 5"
        m3 = re.search(r"\b(remplacement|replace)\b\s+(\d+)", t)
        if m3:
            return ("suggest_replacement", {"absence_id": int(m3.group(2))})
        return ("help_replacement_format", {})

    return ("unknown", {})

def who_is_available(date_str):
    emps = q_all("SELECT id, fullname, role FROM employees WHERE active=1 ORDER BY fullname")
    available = []
    for e in emps:
        if not employee_is_absent(e["id"], date_str):
            available.append(e)
    return available

def suggest_replacement(absence_id: int):
    abs_row = q_one("SELECT * FROM absences WHERE id=?", (absence_id,))
    if not abs_row:
        return {"ok": False, "message": "Absence introuvable."}

    if abs_row["status"] != "approved":
        return {"ok": False, "message": "L'absence doit être approuvée avant de proposer un remplacement."}

    emp = q_one("SELECT * FROM employees WHERE id=?", (abs_row["employee_id"],))
    if not emp:
        return {"ok": False, "message": "Employé absent introuvable."}

    # MVP: propose any active employee with same role, not absent on start_date
    candidates = q_all("""
        SELECT id, fullname, role FROM employees
        WHERE active=1 AND role=?
          AND id != ?
        ORDER BY fullname
    """, (emp["role"], emp["id"]))

    picks = []
    for c in candidates:
        if not employee_is_absent(c["id"], abs_row["start_date"]):
            picks.append(c)
    return {"ok": True, "absent": emp["fullname"], "candidates": picks[:5]}

def handle_message(text: str):
    intent, args = parse_intent(text)

    if intent == "generate_planning":
        # default: current week based on "today" from sqlite
        # We'll take next Monday from SQLite using date('now')
        row = q_one("""
            SELECT
              date('now', 'weekday 1', '-7 days') AS week_start
        """)
        res = generate_week_schedule(row["week_start"])
        return f"✅ Planning généré pour la semaine {res['week_start']} → {res['week_end']}."

    if intent == "who_is_available":
        date_str = args["date"]
        av = who_is_available(date_str)
        if not av:
            return f"❌ Personne n'est disponible le {date_str}."
        names = ", ".join([f"{e['fullname']} ({e['role']})" for e in av[:10]])
        return f"📅 Disponibles le {date_str} : {names}"

    if intent == "request_absence":
        employee_id = args["employee_id"]
        start = args["start"]
        end = args["end"]
        exec_sql("""
            INSERT INTO absences (employee_id, start_date, end_date, reason, status)
            VALUES (?, ?, ?, 'via agent', 'pending')
        """, (employee_id, start, end))
        return f"📝 Demande d'absence créée (employee_id={employee_id}) du {start} au {end} (status=pending)."

    if intent == "help_absence_format":
        return "Format : `absence <employee_id> <YYYY-MM-DD> <YYYY-MM-DD>` مثال: `absence 2 2026-03-05 2026-03-06`"

    if intent == "suggest_replacement":
        res = suggest_replacement(args["absence_id"])
        if not res["ok"]:
            return "❌ " + res["message"]
        cand = res["candidates"]
        if not cand:
            return f"⚠️ Aucun remplaçant trouvé pour {res['absent']}."
        names = ", ".join([c["fullname"] for c in cand])
        return f"🔁 Remplaçants possibles pour {res['absent']} : {names}"

    if intent == "help_replacement_format":
        return "Format : `remplacement <absence_id>` مثال: `remplacement 3`"

    return (
        "Je peux aider avec :\n"
        "- `génère planning`\n"
        "- `dispo YYYY-MM-DD`\n"
        "- `absence <id> <date1> <date2>`\n"
        "- `remplacement <absence_id>`"
    )