from models.db import exec_sql, get_conn

SCHEMA = """
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS employee_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS absences;
DROP TABLE IF EXISTS demand_signals;
DROP TABLE IF EXISTS rules_config;
DROP TABLE IF EXISTS employees;

CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fullname TEXT NOT NULL,
  role TEXT NOT NULL,
  contract_type TEXT DEFAULT 'CDI',
  weekly_hours INTEGER DEFAULT 40,
  active INTEGER DEFAULT 1
);

CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE employee_skills (
  employee_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  PRIMARY KEY (employee_id, skill_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,         -- YYYY-MM-DD
  start_time TEXT NOT NULL,   -- HH:MM
  end_time TEXT NOT NULL,     -- HH:MM
  required_role TEXT,
  required_skill TEXT,
  min_staff INTEGER DEFAULT 1
);

CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  status TEXT DEFAULT 'planned',
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE absences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE demand_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  customers_count INTEGER DEFAULT 0,
  rx_count INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE rules_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  min_rest_hours INTEGER DEFAULT 11,
  max_daily_hours INTEGER DEFAULT 8,
  max_weekly_hours INTEGER DEFAULT 40
);
"""

def main():
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        conn.commit()

    # rules
    exec_sql("INSERT INTO rules_config(min_rest_hours, max_daily_hours, max_weekly_hours) VALUES (11,8,40)")

    # skills
    for s in ["Délivrance", "Caisse", "Stock", "Conseil", "Management"]:
        exec_sql("INSERT INTO skills(name) VALUES (?)", (s,))

    # employees
    employees = [
        ("Sara B.", "Pharmacien", 40),
        ("Youssef K.", "Préparateur", 40),
        ("Amira S.", "Caissier", 30),
        ("Hedi M.", "Préparateur", 40),
        ("Lina A.", "Pharmacien", 40),
    ]
    for name, role, wh in employees:
        exec_sql("INSERT INTO employees(fullname, role, weekly_hours) VALUES (?,?,?)", (name, role, wh))

    # employee_skills
    # helper get skill id
    from models.db import q_one
    def sid(skill):
        return q_one("SELECT id FROM skills WHERE name=?", (skill,))["id"]

    # Sara: délivrance(3), conseil(3)
    exec_sql("INSERT INTO employee_skills VALUES (?,?,?)", (1, sid("Délivrance"), 3))
    exec_sql("INSERT INTO employee_skills VALUES (?,?,?)", (1, sid("Conseil"), 3))

    # Youssef: délivrance(2), stock(3)
    exec_sql("INSERT INTO employee_skills VALUES (?,?,?)", (2, sid("Délivrance"), 2))
    exec_sql("INSERT INTO employee_skills VALUES (?,?,?)", (2, sid("Stock"), 3))

    # Amira: caisse(3)
    exec_sql("INSERT INTO employee_skills VALUES (?,?,?)", (3, sid("Caisse"), 3))

    # Hedi: stock(2), délivrance(2)
    exec_sql("INSERT INTO employee_skills VALUES (?,?,?)", (4, sid("Stock"), 2))
    exec_sql("INSERT INTO employee_skills VALUES (?,?,?)", (4, sid("Délivrance"), 2))

    # Lina: délivrance(3), management(2)
    exec_sql("INSERT INTO employee_skills VALUES (?,?,?)", (5, sid("Délivrance"), 3))
    exec_sql("INSERT INTO employee_skills VALUES (?,?,?)", (5, sid("Management"), 2))

    # Create shifts for a demo week (starting Monday 2026-03-02 for example)
    week_start = "2026-03-02"
    # 7 days, morning + evening
    for i in range(7):
        # date = week_start + i days in SQLite
        d = q_one("SELECT date(?, ? || ' day') AS d", (week_start, i))["d"]
        # morning
        exec_sql("""
            INSERT INTO shifts(date,start_time,end_time,required_skill,min_staff)
            VALUES (?,?,?,?,?)
        """, (d, "08:00", "14:00", "Délivrance", 2))
        # evening
        exec_sql("""
            INSERT INTO shifts(date,start_time,end_time,required_skill,min_staff)
            VALUES (?,?,?,?,?)
        """, (d, "14:00", "20:00", "Délivrance", 2))

    # demand_signals: some history
    # previous weeks + this week to show alert
    for day in ["2026-02-16","2026-02-23"]:
        for hour, c in [(10,20),(11,22),(18,30),(19,32)]:
            exec_sql("INSERT INTO demand_signals(date,hour,customers_count,rx_count,notes) VALUES (?,?,?,?,?)",
                     (day, hour, c, int(c*0.6), "history"))

    # today within demo week (for alert)
    exec_sql("INSERT INTO demand_signals(date,hour,customers_count,rx_count,notes) VALUES (?,?,?,?,?)",
             ("2026-03-02", 10, 40, 25, "peak"))  # bigger than avg -> alert

    # absence example: Youssef absent Wednesday (2026-03-04)
    exec_sql("""
        INSERT INTO absences(employee_id,start_date,end_date,reason,status)
        VALUES (?,?,?,?,?)
    """, (2, "2026-03-04", "2026-03-04", "Maladie", "approved"))

    print("✅ DB seeded at data/pharma.db")

if __name__ == "__main__":
    main()