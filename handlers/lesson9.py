from flask import request


def handle(database_path):
    # Заголовки — это строки, которые браузер шлёт серверу в каждом запросе.
    headers = [{"name": name, "value": value} for name, value in request.headers.items()]
    return {"ip": request.remote_addr, "headers": headers}
