from models.db import q_all, q_one

def get_rules():
    row = q_one("SELECT * FROM rules_config ORDER BY id DESC LIMIT 1")
    # defaults
    return {
        "min_rest_hours": int(row["min_rest_hours"]) if row else 11,
        "max_daily_hours": int(row["max_daily_hours"]) if row else 8,
        "max_weekly_hours": int(row["max_weekly_hours"]) if row else 40,
    }

def employee_is_absent(employee_id, date_str):
    row = q_one("""
        SELECT 1 FROM absences
        WHERE employee_id = ?
          AND status = 'approved'
          AND date(?) BETWEEN date(start_date) AND date(end_date)
        LIMIT 1
    """, (employee_id, date_str))
    return row is not None

def employee_weekly_assigned_hours(employee_id, week_start, week_end):
    rows = q_all("""
        SELECT s.date, s.start_time, s.end_time
        FROM assignments a
        JOIN shifts s ON s.id = a.shift_id
        WHERE a.employee_id = ?
          AND a.status IN ('planned','confirmed')
          AND date(s.date) BETWEEN date(?) AND date(?)
    """, (employee_id, week_start, week_end))
    total = 0.0
    for r in rows:
        total += shift_hours(r["start_time"], r["end_time"])
    return total

def shift_hours(start_time, end_time):
    # "08:00" -> hours float
    sh, sm = map(int, start_time.split(":"))
    eh, em = map(int, end_time.split(":"))
    return ((eh*60+em) - (sh*60+sm)) / 60.0

def employee_daily_assigned_hours(employee_id, date_str):
    rows = q_all("""
        SELECT s.start_time, s.end_time
        FROM assignments a
        JOIN shifts s ON s.id = a.shift_id
        WHERE a.employee_id = ?
          AND a.status IN ('planned','confirmed')
          AND date(s.date) = date(?)
    """, (employee_id, date_str))
    return sum(shift_hours(r["start_time"], r["end_time"]) for r in rows)

def employee_rest_ok(employee_id, date_str, new_start, rules):
    """
    Vérifie repos min entre dernier shift veille et new_start.
    MVP simple: si a travaillé la veille, end_time doit laisser min_rest_hours.
    """
    prev = q_one("""
        SELECT s.date, s.end_time
        FROM assignments a
        JOIN shifts s ON s.id = a.shift_id
        WHERE a.employee_id = ?
          AND a.status IN ('planned','confirmed')
          AND date(s.date) = date(?, '-1 day')
        ORDER BY s.end_time DESC
        LIMIT 1
    """, (employee_id, date_str))
    if not prev:
        return True

    # minutes
    end_h, end_m = map(int, prev["end_time"].split(":"))
    start_h, start_m = map(int, new_start.split(":"))
    end_minutes = end_h*60 + end_m
    start_minutes = start_h*60 + start_m

    # repos entre (veille end -> lendemain start) = (24h - end) + start
    rest_minutes = (24*60 - end_minutes) + start_minutes
    return rest_minutes >= rules["min_rest_hours"] * 60