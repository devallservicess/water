import re
import os
from groq import Groq
from models.db import q_all, q_one, exec_sql
from services.scheduler import generate_week_schedule
from services.rules import employee_is_absent

# ── Groq AI Client ──────────────────────────────────
client = None
try:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
except Exception:
    pass

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

SYSTEM_PROMPT = """Tu es un assistant RH intelligent pour une pharmacie. Tu parles en français.
Tu aides les managers avec:
- La gestion du planning (shifts matinaux 08h-14h, shifts du soir 14h-20h)
- Les absences (demandes, approbations, remplacements)
- La disponibilité des employés
- Les recommandations de staffing basées sur les données

Quand on te demande de faire une action (générer planning, ajouter absence, etc.), 
réponds que tu as exécuté l'action et fournis un résumé clair.

Tu as accès aux données suivantes sur la pharmacie:
{context}

Réponds de manière concise, professionnelle et en utilisant des emojis pour rendre la lecture agréable.
"""

# ── Regex intent parser (fallback) ──────────────────
def parse_intent(text: str):
    t = text.lower().strip()

    if re.search(r"\b(génère|generer|generate|planif)\b.*\bplanning\b", t):
        return ("generate_planning", {})

    m = re.search(r"\b(dispo|libre|available)\b.*\b(\d{4}-\d{2}-\d{2})\b", t)
    if m:
        return ("who_is_available", {"date": m.group(2)})

    if re.search(r"\b(ajoute|add|crée|cree)\b.*\babsence\b", t):
        m2 = re.search(r"\babsence\b\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})", t)
        if m2:
            return ("request_absence", {"employee_id": int(m2.group(1)), "start": m2.group(2), "end": m2.group(3)})
        return ("help_absence_format", {})

    if re.search(r"\b(remplacement|replace)\b", t):
        m3 = re.search(r"\b(remplacement|replace)\b\s+(\d+)", t)
        if m3:
            return ("suggest_replacement", {"absence_id": int(m3.group(2))})
        return ("help_replacement_format", {})

    return ("unknown", {})


# ── Data context builder ────────────────────────────
def build_context():
    """Build a short context string from the current database state."""
    try:
        emps = q_all("SELECT id, fullname, role, active FROM employees ORDER BY fullname")
        emp_list = [f"  - #{e['id']} {e['fullname']} ({e['role']}, {'actif' if e['active'] else 'inactif'})" for e in emps]

        abs_rows = q_all("""
            SELECT a.id, e.fullname, a.start_date, a.end_date, a.status
            FROM absences a JOIN employees e ON e.id = a.employee_id
            ORDER BY a.id DESC LIMIT 10
        """)
        abs_list = [f"  - #{a['id']} {a['fullname']}: {a['start_date']} → {a['end_date']} ({a['status']})" for a in abs_rows]

        today = q_one("SELECT date('now') AS d")["d"]

        return (
            f"Date du jour: {today}\n"
            f"Employés ({len(emp_list)}):\n" + "\n".join(emp_list) + "\n"
            f"Absences récentes:\n" + "\n".join(abs_list) if abs_list else "Aucune absence"
        )
    except Exception:
        return "Données indisponibles."


# ── Action handlers ─────────────────────────────────
def who_is_available(date_str):
    emps = q_all("SELECT id, fullname, role FROM employees WHERE active=1 ORDER BY fullname")
    return [e for e in emps if not employee_is_absent(e["id"], date_str)]


def suggest_replacement(absence_id: int):
    abs_row = q_one("SELECT * FROM absences WHERE id=?", (absence_id,))
    if not abs_row:
        return {"ok": False, "message": "Absence introuvable."}
    if abs_row["status"] != "approved":
        return {"ok": False, "message": "L'absence doit être approuvée avant de proposer un remplacement."}

    emp = q_one("SELECT * FROM employees WHERE id=?", (abs_row["employee_id"],))
    if not emp:
        return {"ok": False, "message": "Employé introuvable."}

    candidates = q_all("""
        SELECT id, fullname, role FROM employees
        WHERE active=1 AND role=? AND id != ?
        ORDER BY fullname
    """, (emp["role"], emp["id"]))

    picks = [c for c in candidates if not employee_is_absent(c["id"], abs_row["start_date"])]
    return {"ok": True, "absent": emp["fullname"], "candidates": picks[:5]}


# ── Main handler ────────────────────────────────────
def handle_message(text: str):
    intent, args = parse_intent(text)

    # Handle structured commands via regex first
    if intent == "generate_planning":
        row = q_one("SELECT date('now', 'weekday 1', '-7 days') AS week_start")
        res = generate_week_schedule(row["week_start"])
        return f"✅ Planning généré pour la semaine {res['week_start']} → {res['week_end']}."

    if intent == "who_is_available":
        av = who_is_available(args["date"])
        if not av:
            return f"❌ Personne n'est disponible le {args['date']}."
        names = ", ".join([f"{e['fullname']} ({e['role']})" for e in av[:10]])
        return f"📅 Disponibles le {args['date']} : {names}"

    if intent == "request_absence":
        exec_sql("""
            INSERT INTO absences (employee_id, start_date, end_date, reason, status)
            VALUES (?, ?, ?, 'via agent', 'pending')
        """, (args["employee_id"], args["start"], args["end"]))
        return f"📝 Demande d'absence créée (employee_id={args['employee_id']}) du {args['start']} au {args['end']} (status=pending)."

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

    # For any unknown intent → use Groq AI
    if client:
        try:
            context = build_context()
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
                {"role": "user", "content": text}
            ]
            completion = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=800,
            )
            return completion.choices[0].message.content
        except Exception as e:
            return f"⚠️ Erreur AI: {str(e)}\n\nCommandes disponibles:\n- `génère planning`\n- `dispo YYYY-MM-DD`\n- `absence <id> <date1> <date2>`\n- `remplacement <absence_id>`"

    return (
        "Je peux aider avec :\n"
        "- `génère planning`\n"
        "- `dispo YYYY-MM-DD`\n"
        "- `absence <id> <date1> <date2>`\n"
        "- `remplacement <absence_id>`"
    )