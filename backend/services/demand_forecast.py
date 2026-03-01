from models.db import q_all, q_one

def demand_alerts_for_date(date_str, threshold=1.35):
    """
    MVP: compare today's customers_count by hour vs avg for same weekday+hour.
    Return alerts when today > avg*threshold
    """
    weekday = q_one("SELECT strftime('%w', ?) AS w", (date_str,))["w"]  # 0=Sun

    today = q_all("""
        SELECT hour, customers_count, rx_count
        FROM demand_signals
        WHERE date(date)=date(?)
        ORDER BY hour
    """, (date_str,))

    alerts = []
    for r in today:
        avg = q_one("""
            SELECT AVG(customers_count) AS avg_c
            FROM demand_signals
            WHERE strftime('%w', date)=?
              AND hour=?
              AND date(date) < date(?)
        """, (weekday, r["hour"], date_str))
        avg_c = float(avg["avg_c"]) if avg and avg["avg_c"] is not None else None

        if avg_c is not None and r["customers_count"] > avg_c * threshold:
            alerts.append({
                "hour": r["hour"],
                "today": r["customers_count"],
                "avg": round(avg_c, 1),
                "message": "Surcharge probable (clients > moyenne)"
            })

    return alerts