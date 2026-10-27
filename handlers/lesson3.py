import sqlite3

from flask import request


def handle(database_path):
    word = request.form.get("word", "").strip()
    if not word:
        return {"message": "Введи текст или подставь пример INSERT.", "query": "", "columns": [], "rows": []}

    # Текст вставляется прямо в SQL: так появляется возможность инъекции.
    query = (
        "SELECT login, name, about FROM users "
        f"WHERE login LIKE '%{word}%'"
    )

    with sqlite3.connect(database_path) as database:
        try:
            # executescript выполняет несколько SQL-команд через точку с запятой.
            # Поэтому добавленный в поле INSERT действительно выполнится.
            database.executescript(query)
            message = f"Выполнено. Изменено строк: {database.total_changes}."
        except sqlite3.Error as error:
            message = f"Ошибка SQL: {error}"

        # Показываем таблицу после выполнения, чтобы увидеть добавленную запись.
        try:
            result = database.execute("SELECT * FROM users")
            columns = [column[0] for column in result.description]
            rows = result.fetchall()
        except sqlite3.Error:
            columns, rows = [], []

    return {"message": message, "query": query, "columns": columns, "rows": rows}
