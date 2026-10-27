import ast
import runpy
import sqlite3
import subprocess
import tempfile
from pathlib import Path

from flask import Flask, abort, render_template, request

app = Flask(__name__)
PROJECT = Path(__file__).resolve().parent
DATABASE = PROJECT / "users.db"
SOURCE_FILES = {
    1: {"python": "handlers/lesson1.py", "vue": "static/lesson1.js"},
    2: {"python": "handlers/lesson2.py", "vue": "static/lesson2.js"},
    3: {"python": "handlers/lesson3.py", "vue": "static/lesson3.js"},
    4: {"python": "handlers/lesson4.py", "vue": "static/lesson4.js"},
}

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


@app.get("/")
@app.get("/lessons/1")
def index():
    version = (PROJECT / SOURCE_FILES[1]["vue"]).stat().st_mtime_ns
    return render_template("index.html", lesson_number=1, version=version)


@app.get("/lessons/2")
def search_lesson():
    version = (PROJECT / SOURCE_FILES[2]["vue"]).stat().st_mtime_ns
    return render_template("index.html", lesson_number=2, version=version)


@app.get("/lessons/3")
def injection_lesson():
    version = (PROJECT / SOURCE_FILES[3]["vue"]).stat().st_mtime_ns
    return render_template("index.html", lesson_number=3, version=version)


@app.get("/lessons/4")
def about_lesson():
    version = (PROJECT / SOURCE_FILES[4]["vue"]).stat().st_mtime_ns
    return render_template("index.html", lesson_number=4, version=version)


@app.get("/lessons")
def lessons():
    return render_template("lessons.html")


@app.get("/lessons/<int:number>")
def lesson(number):
    if number != 5:
        abort(404)
    return render_template("lesson.html", number=number)


@app.get("/sql")
def sql():
    # Берём все столбцы и все строки прямо из базы.
    query = "SELECT * FROM users"
    with sqlite3.connect(DATABASE) as database:
        try:
            result = database.execute(query)
            columns = [column[0] for column in result.description]
            rows = result.fetchall()
            message = ""
        except sqlite3.Error as error:
            columns, rows = [], []
            message = f"Ошибка SQL: {error}"
        schema_row = database.execute(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
        ).fetchone()
        schema = schema_row[0] if schema_row else "Таблица users не существует."

    return render_template(
        "sql.html", columns=columns, rows=rows, query=query, message=message, schema=schema
    )


@app.post("/sql/query")
def sql_query():
    query = request.form.get("query", "").strip()
    if not query:
        return {"message": "Сначала напиши запрос.", "columns": [], "rows": []}

    # Выполняем один SQL-запрос. Изменения сохраняются в users.db.
    try:
        with sqlite3.connect(DATABASE) as database:
            result = database.execute(query)
            if result.description:
                columns = [column[0] for column in result.description]
                rows = result.fetchall()
                message = f"Получено строк: {len(rows)}."
            else:
                columns, rows = [], []
                message = f"Готово. Изменено строк: {max(result.rowcount, 0)}."
    except sqlite3.Error as error:
        return {"message": f"Ошибка SQL: {error}", "columns": [], "rows": []}

    return {"message": message, "columns": columns, "rows": rows}


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


def call_handler(lesson_number):
    # Читаем файл заново: сохранённый код работает уже при следующем запросе.
    path = PROJECT / SOURCE_FILES[lesson_number]["python"]
    try:
        handler = runpy.run_path(str(path))["handle"]
        return handler(DATABASE)
    except Exception as error:
        return {"message": f"Ошибка Python: {error}", "query": "", "rows": [], "user": None}


def source_file(lesson_number, language):
    try:
        return PROJECT / SOURCE_FILES[int(lesson_number)][language]
    except (ValueError, TypeError, KeyError):
        abort(404)


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

    # Сначала записываем временный файл, затем заменяем настоящий целиком.
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as temporary:
        temporary.write(source)
        temporary_path = Path(temporary.name)
    try:
        temporary_path.replace(path)
    finally:
        temporary_path.unlink(missing_ok=True)
    return {"valid": True, "message": "Файл сохранён.", "path": str(path.relative_to(PROJECT))}


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000)
