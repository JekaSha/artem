import sqlite3

from flask import jsonify, make_response, request


def handle(database_path):
    # Кука user — это просто логин, который браузер присылает каждый раз.
    current = request.cookies.get("user", "")

    if request.method == "POST":
        login = request.form.get("login", "")
        password = request.form.get("password", "")
        with sqlite3.connect(database_path) as database:
            user = database.execute(
                "SELECT name FROM users WHERE login = ? AND password = ?", (login, password)
            ).fetchone()
        if not user:
            return {"message": "Неверный логин или пароль.", "cookie": current}

        # Пароль сошёлся — кладём логин в куку. Дальше сайт верит куке.
        answer = make_response(jsonify(message=f"Вошёл как {user[0]}. Логин записали в куку.", cookie=login))
        answer.set_cookie("user", login)
        return answer

    # Обычное открытие страницы: смотрим, что за логин в куке, и верим ему.
    if not current:
        return {"message": "Ты ещё не вошёл. Куки user нет.", "cookie": ""}
    with sqlite3.connect(database_path) as database:
        user = database.execute("SELECT name FROM users WHERE login = ?", (current,)).fetchone()
    name = user[0] if user else current
    return {"message": f"Сайт думает, что ты {name}, потому что в куке user = {current}.", "cookie": current}
