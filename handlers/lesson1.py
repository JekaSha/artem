import sqlite3

from flask import request


def handle(database_path):
    # Получаем логин и пароль из формы Vue.
    login = request.form.get("login", "")
    password = request.form.get("password", "")

    # Учебный запрос с прямой подстановкой текста.
    query = (
        "SELECT login, name, about FROM users "
        f"WHERE login = '{login}' AND password = '{password}'"
    )
    try:
        with sqlite3.connect(database_path) as database:
            user = database.execute(query).fetchone()
    except sqlite3.Error as error:
        return {"message": f"Ошибка SQL: {error}", "query": query, "user": None}

    if user:
        profile = {"login": user[0], "name": user[1], "about": user[2]}
        message = f"Привет, {user[1]}! Это твой профиль."
    else:
        profile = None
        message = "Неверный логин или пароль."

    # Возвращаем имя, логин, описание и выполненный SQL-запрос.
    return {"message": message, "query": query, "user": profile}
