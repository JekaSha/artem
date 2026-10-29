import ast
import runpy
import sqlite3
import subprocess
from pathlib import Path

from flask import Flask, render_template, request, send_from_directory

app = Flask(__name__)
PROJECT = Path(__file__).resolve().parent
DATABASE = PROJECT / "users.db"
app.config["UPLOAD_FOLDER"] = PROJECT / "uploads"
SOURCE_FILES = {
    1: {"python": "handlers/lesson1.py", "vue": "static/lesson1.js"},
    2: {"python": "handlers/lesson2.py", "vue": "static/lesson2.js"},
    3: {"python": "handlers/lesson3.py", "vue": "static/lesson3.js"},
    4: {"python": "handlers/lesson4.py", "vue": "static/lesson4.js"},
    5: {"python": "handlers/lesson5.py", "vue": "static/lesson5.js"},
    6: {"python": "handlers/lesson6.py", "vue": "static/lesson6.js"},
    7: {"python": "handlers/lesson7.py", "vue": "static/lesson7.js"},
    8: {"python": "handlers/lesson8.py", "vue": "static/lesson8.js"},
    9: {"python": "handlers/lesson9.py", "vue": "static/lesson9.js"},
}

# Заголовок и короткое описание каждого урока.
LESSONS = {
    1: ("Урок 1. Как работает вход в профиль", "Вводишь данные → Python ищет пользователя в базе → видишь имя, логин и описание."),
    2: ("Урок 2. Поиск пользователей", "Вводишь часть логина → видишь SQL-запрос → получаешь имя и описание. LIKE '%art%' значит «логин содержит art»."),
    3: ("Урок 3. SQL-инъекция с INSERT", "В поле поиска можно дописать SQL-команду INSERT и добавить пользователя."),
    4: ("Урок 4. Профиль и SQL-инъекция через about", "Меняешь описание about → видишь карточку. В поле about можно встроить INSERT и добавить ещё один профиль."),
    5: ("Урок 5. Загрузка файлов на сервер", "Отправляешь файлы в Python → видишь их под формой. Загруженный .py можно выполнить на сервере."),
    6: ("Урок 6. Куки: как сайт помнит вход", "Входишь → сайт кладёт логин в куку. Куку можно подделать и войти чужим без пароля."),
    7: ("Урок 7. Гостевая книга и XSS", "Оставляешь сообщение → его видят все. Через v-html чужой HTML и скрипт выполнятся у каждого."),
    8: ("Урок 8. Пароли: открытый текст и хеш", "Смотрим пароли в базе и их хеши. Почему хранить 1234 открыто — плохо."),
    9: ("Урок 9. Что браузер шлёт на сервер", "Каждый запрос несёт заголовки: какой браузер, какой язык, какие куки. Их видит сервер."),
}


# total — сколько всего уроков. Нужно в меню и навигации на всех страницах.
@app.context_processor
def inject_total():
    return {"total": len(LESSONS)}

# База — это файл users.db рядом с этим скриптом.
with sqlite3.connect(DATABASE) as database:
    database.execute("""
        CREATE TABLE IF NOT EXISTS users (
            login TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            about TEXT NOT NULL DEFAULT ''
        )
    """)

    # Если база уже существовала, добавляем новый столбец без удаления данных.
    columns = [column[1] for column in database.execute("PRAGMA table_info(users)")]
    if "about" not in columns:
        database.execute("ALTER TABLE users ADD COLUMN about TEXT NOT NULL DEFAULT ''")
        database.executemany(
            "UPDATE users SET about = ? WHERE login = ?",
            [
                ("Учусь писать программы на Python.", "artem"),
                ("Люблю игры и изучаю базы данных.", "kirill"),
            ],
        )

    # Добавляем пользователей, чтобы сразу можно было попробовать вход.
    database.executemany(
        "INSERT OR IGNORE INTO users (login, password, name, about) VALUES (?, ?, ?, ?)",
        [
            ("artem", "1234", "Артём", "Учусь писать программы на Python."),
            ("kirill", "1234", "Кирилл", "Люблю игры и изучаю базы данных."),
        ],
    )

    # Гостевая книга урока 7: одна строка — одно сообщение.
    database.execute("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, text TEXT NOT NULL)")

    # Таблица результатов игр. login показывает, чей это результат.
    database.execute("""
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY,
            login TEXT NOT NULL REFERENCES users(login),
            game TEXT NOT NULL,
            points INTEGER NOT NULL
        )
    """)

    # Добавляем результаты, только если таблица пустая.
    if database.execute("SELECT COUNT(*) FROM scores").fetchone()[0] == 0:
        database.executemany(
            "INSERT INTO scores (login, game, points) VALUES (?, ?, ?)",
            [
                ("artem", "Змейка", 120),
                ("artem", "Тетрис", 340),
                ("kirill", "Тетрис", 410),
                ("artem", "Змейка", 95),
                ("kirill", "Гонки", 75),
            ],
        )


@app.get("/")
@app.get("/lessons/<int:number>")
def lesson(number=1):
    title, hint = LESSONS[number]
    version = (PROJECT / SOURCE_FILES[number]["vue"]).stat().st_mtime_ns
    return render_template("index.html", lesson_number=number, version=version, title=title, hint=hint)


@app.get("/lessons")
def lessons():
    return render_template("lessons.html", cards=LESSONS)


def run_sql(query):
    # Выполняем один SQL-запрос. Изменения сохраняются в users.db.
    try:
        with sqlite3.connect(DATABASE) as database:
            result = database.execute(query)
            columns = [column[0] for column in result.description or []]
            rows = result.fetchall()
    except sqlite3.Error as error:
        return {"message": f"Ошибка SQL: {error}", "columns": [], "rows": []}

    if columns:
        message = f"Получено строк: {len(rows)}."
    else:
        message = f"Готово. Изменено строк: {max(result.rowcount, 0)}."
    return {"message": message, "columns": columns, "rows": rows}


@app.get("/sql")
def sql():
    # Читаем обе таблицы и то, что получится, если их соединить.
    users = run_sql("SELECT * FROM users")
    scores = run_sql("SELECT * FROM scores")
    joined = run_sql("SELECT scores.id, scores.login, users.name, scores.game, scores.points "
                     "FROM scores JOIN users ON users.login = scores.login")
    return render_template("sql.html", users=users, scores=scores, joined=joined)


@app.post("/sql/query")
def sql_query():
    return run_sql(request.form.get("query", ""))


@app.post("/login")
def sign_in():
    return call_handler(1)


@app.route("/search", methods=["GET", "POST"])
def search_users():
    return call_handler(2)


@app.post("/injection")
def injection():
    return call_handler(3)


@app.route("/profile", methods=["GET", "POST"])
def profile():
    return call_handler(4)


@app.route("/files", methods=["GET", "POST"])
def files():
    return call_handler(5)


@app.route("/run/<int:number>", methods=["GET", "POST"])
def run_lesson(number):
    return call_handler(number)


@app.get("/uploads/<filename>")
def uploaded_file(filename):
    # .py запускаем как PHP, остальные файлы просто отдаём браузеру.
    if filename.endswith(".py") and "download" not in request.args:
        module = runpy.run_path(str(PROJECT / SOURCE_FILES[5]["python"]))
        return module["execute_file"](app.config["UPLOAD_FOLDER"] / filename)
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


def call_handler(lesson_number):
    # Читаем файл заново: сохранённый код работает уже при следующем запросе.
    path = PROJECT / SOURCE_FILES[lesson_number]["python"]
    try:
        handler = runpy.run_path(str(path))["handle"]
        return handler(DATABASE)
    except Exception as error:
        return {"message": f"Ошибка Python: {error}", "query": "", "rows": [], "user": None}


def source_file(lesson_number, language):
    return PROJECT / SOURCE_FILES[int(lesson_number)][language]


def check_source(path, source, language):
    if not isinstance(source, str) or not source.strip():
        return {"valid": False, "message": "Напиши код перед проверкой."}
    if language == "python":
        try:
            tree = ast.parse(source, filename=str(path))
            compile(tree, str(path), "exec")
        except SyntaxError as error:
            return {"valid": False, "message": f"Строка {error.lineno}: {error.msg}", "line": error.lineno}
        if not any(isinstance(node, ast.FunctionDef) and node.name == "handle" for node in tree.body):
            return {"valid": False, "message": "В файле нужна функция def handle(database_path)."}
    else:
        try:
            result = subprocess.run(
                ["node", "--check", "-"], input=source,
                text=True, capture_output=True, timeout=5,
            )
        except (OSError, subprocess.TimeoutExpired):
            return {"valid": False, "message": "Не удалось запустить Node.js для проверки JavaScript."}
        if result.returncode:
            return {"valid": False, "message": result.stderr.strip()}
    return {"valid": True, "message": "Синтаксических ошибок нет."}


@app.get("/editor/source")
def editor_source():
    path = source_file(request.args.get("lesson"), request.args.get("language"))
    return {
        "source": path.read_text(encoding="utf-8"),
        "path": str(path.relative_to(PROJECT)),
    }, 200, {"Cache-Control": "no-store"}


@app.post("/editor/check")
def editor_check():
    data = request.get_json()
    path = source_file(data.get("lesson"), data.get("language"))
    return check_source(path, data.get("source"), data.get("language"))


@app.post("/editor/save")
def editor_save():
    data = request.get_json()
    path = source_file(data.get("lesson"), data.get("language"))
    source = data.get("source")
    result = check_source(path, source, data.get("language"))
    if not result["valid"]:
        return result

    path.write_text(source, encoding="utf-8")
    return {"valid": True, "message": "Файл сохранён.", "path": str(path.relative_to(PROJECT))}


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000)
