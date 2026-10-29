import sqlite3

from flask import request


def handle(database_path):
    with sqlite3.connect(database_path) as database:
        if request.method == "POST":
            # Сохраняем сообщение как есть, вместе с любыми HTML-тегами.
            text = request.form.get("text", "")
            if text:
                database.execute("INSERT INTO messages (text) VALUES (?)", (text,))

        rows = database.execute("SELECT text FROM messages ORDER BY id DESC").fetchall()

    messages = [row[0] for row in rows]
    return {"messages": messages}
