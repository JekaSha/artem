import hashlib
import sqlite3


def handle(database_path):
    with sqlite3.connect(database_path) as database:
        rows = database.execute("SELECT login, password FROM users").fetchall()

    users = []
    for login, password in rows:
        # Хеш — это «отпечаток» пароля. Из хеша пароль обратно не достать.
        digest = hashlib.sha256(password.encode()).hexdigest()
        users.append({"login": login, "password": password, "hash": digest})

    return {"users": users}
