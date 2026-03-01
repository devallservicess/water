from models.db import q_all, q_one, exec_sql
from services.rules import (
    get_rules,
    employee_is_absent,
    employee_weekly_assigned_hours,
    employee_daily_assigned_hours,
    employee_rest_ok,
    shift_hours
)

def week_bounds(week_start):
    # week_start is "YYYY-MM-DD", end = +6 days
    row = q_one("SELECT date(?, '+6 day') AS end", (week_start,))
    return week_start, row["end"]

def eligible_employees(required_skill=None, required_role=None):
    if required_skill:
        return q_all("""
            SELECT DISTINCT e.*
            FROM employees e
            JOIN employee_skills es ON es.employee_id = e.id
            JOIN skills s ON s.id = es.skill_id
            WHERE e.active = 1
              AND s.name = ?
            ORDER BY e.fullname
        """, (required_skill,))
    if required_role:
        return q_all("""
            SELECT * FROM employees
            WHERE active = 1 AND role = ?
            ORDER BY fullname
        """, (required_role,))
    return q_all("SELECT * FROM employees WHERE active = 1 ORDER BY fullname")

def clear_week_assignments(week_start):
    week_start, week_end = week_bounds(week_start)
    exec_sql("""
        DELETE FROM assignments
        WHERE shift_id IN (
            SELECT id FROM shifts
            WHERE date(date) BETWEEN date(?) AND date(?)
        )
    """, (week_start, week_end))

def ensure_week_shifts(week_start):
    """Auto-create default morning + evening shifts for each day of the week if none exist."""
    week_start, week_end = week_bounds(week_start)
    existing = q_one("""
        SELECT COUNT(*) AS c FROM shifts
        WHERE date(date) BETWEEN date(?) AND date(?)
    """, (week_start, week_end))
    if existing["c"] > 0:
        return  # shifts already exist

    for i in range(7):
        d = q_one("SELECT date(?, ? || ' day') AS d", (week_start, i))["d"]
        # morning shift
        exec_sql("""
            INSERT INTO shifts(date, start_time, end_time, required_skill, min_staff)
            VALUES (?, ?, ?, ?, ?)
        """, (d, "08:00", "14:00", "Délivrance", 2))
        # evening shift
        exec_sql("""
            INSERT INTO shifts(date, start_time, end_time, required_skill, min_staff)
            VALUES (?, ?, ?, ?, ?)
        """, (d, "14:00", "20:00", "Délivrance", 2))

def generate_week_schedule(week_start):
    rules = get_rules()
    week_start, week_end = week_bounds(week_start)

    # Auto-create default shifts if none exist for this week
    ensure_week_shifts(week_start)

    shifts = q_all("""
        SELECT * FROM shifts
        WHERE date(date) BETWEEN date(?) AND date(?)
        ORDER BY date(date), start_time
    """, (week_start, week_end))

    clear_week_assignments(week_start)

    for sh in shifts:
        needed = int(sh["min_staff"])
        chosen = []

        pool = eligible_employees(sh["required_skill"], sh["required_role"])

        # score: prefer employees with fewer weekly hours
        scored = []
        for e in pool:
            if employee_is_absent(e["id"], sh["date"]):
                continue

            # daily max
            d_hours = employee_daily_assigned_hours(e["id"], sh["date"])
            if d_hours + shift_hours(sh["start_time"], sh["end_time"]) > rules["max_daily_hours"]:
                continue

            # rest
            if not employee_rest_ok(e["id"], sh["date"], sh["start_time"], rules):
                continue

            w_hours = employee_weekly_assigned_hours(e["id"], week_start, week_end)
            if w_hours + shift_hours(sh["start_time"], sh["end_time"]) > min(rules["max_weekly_hours"], float(e["weekly_hours"])):
                continue

            scored.append((w_hours, e))

        scored.sort(key=lambda x: x[0])  # fewer hours first

        for _, e in scored:
            if len(chosen) >= needed:
                break
            chosen.append(e)

        # save assignments
        for e in chosen:
            exec_sql("""
                INSERT INTO assignments (shift_id, employee_id, status)
                VALUES (?, ?, 'planned')
            """, (sh["id"], e["id"]))

    return {"ok": True, "week_start": week_start, "week_end": week_end}
