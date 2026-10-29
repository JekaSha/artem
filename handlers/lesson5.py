import os
import subprocess
import sys
from pathlib import Path

from flask import current_app, request


def handle(database_path):
    # Загруженные файлы лежат в папке uploads на сервере.
    folder = Path(current_app.config["UPLOAD_FOLDER"])
    folder.mkdir(exist_ok=True)
    message = ""

    if request.method == "POST":
        uploaded_files = request.files.getlist("files")
        for uploaded in uploaded_files:
            # Сохраняем файл под тем именем, которое прислал браузер.
            uploaded.save(folder / uploaded.filename)
        message = f"Загружено файлов: {len(uploaded_files)}."

    # Перечитываем папку, чтобы показать всё, что уже загружено.
    files = []
    for path in sorted(folder.iterdir()):
        files.append({
            "name": path.name,
            "size": path.stat().st_size,
            "url": "/uploads/" + path.name,
            "image": path.suffix.lower() in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".ico"],
            "python": path.suffix == ".py",
        })

    return {"message": message, "files": files}


def execute_file(path):
    # Как у PHP: запускаем Python-файл, а его вывод становится страницей.
    # Папку из адреса (?path=...) передаём программе через переменную BROWSE.
    env = dict(os.environ)
    env["BROWSE"] = request.args.get("path", "")
    result = subprocess.run([sys.executable, path], cwd=path.parent, capture_output=True, text=True, env=env)
    return result.stdout + result.stderr
