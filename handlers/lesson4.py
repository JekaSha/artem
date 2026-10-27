import sqlite3

from flask import request


def handle(database_path):
    query = ""
    message = ""
    with sqlite3.connect(database_path) as database:
        database.row_factory = sqlite3.Row

        if request.method == "POST":
            login = request.form.get("login", "")
            about = request.form.get("about", "")
            if not login:
                return {"message": "Выбери пользователя.", "query": "", "profiles": []}

            # Намеренно вставляем описание прямо в UPDATE для учебной инъекции.
            query = f"UPDATE users SET about = '{about}' WHERE login = '{login}'"
            try:
                # После UPDATE можно дописать INSERT через точку с запятой.
                database.executescript(query)
                message = f"Выполнено. Изменено строк: {database.total_changes}."
            except sqlite3.Error as error:
                message = f"Ошибка SQL: {error}"

        # Перечитываем профили, чтобы карточки показывали реальные данные базы.
        try:
            rows = database.execute("SELECT login, name, about FROM users").fetchall()
            profiles = [dict(row) for row in rows]
        except sqlite3.Error as error:
            profiles = []
            message = f"Ошибка SQL: {error}"

    return {"message": message, "query": query, "profiles": profiles}
