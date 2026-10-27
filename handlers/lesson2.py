import sqlite3

from flask import request


def handle(database_path):
    # Берём слово из параметра URL ?word=... или из отправленной формы.
    word = request.values.get("word", "").strip()
    if not word:
        return {"message": "Введи логин или его часть.", "query": "", "rows": []}

    # LIKE ищет похожий текст. % означает «любые символы».
    # Учебный вариант с прямой подстановкой текста в SQL.
    query = (
        "SELECT login, name, about FROM users "
        f"WHERE login LIKE '%{word}%'"
    )
    try:
        with sqlite3.connect(database_path) as database:
            rows = database.execute(query).fetchall()
    except sqlite3.Error as error:
        return {"message": f"Ошибка SQL: {error}", "query": query, "rows": []}

    message = f"Найдено пользователей: {len(rows)}."
    return {"message": message, "query": query, "rows": rows}
