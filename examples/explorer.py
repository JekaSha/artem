# Загрузи этот файл в уроке 5.
# Потом открой http://127.0.0.1:8000/uploads/explorer.py
# По папкам можно ходить, файлы открываются в новой вкладке.
import os

here = os.environ.get("BROWSE") or ".."

print("<h1>Файлы на сервере</h1>")
print("<p>Папка: " + here + "</p>")

if os.path.isdir(here):
    print('<p><a href="/uploads/explorer.py?path=' + here + '/..">.. вверх</a></p>')
    for name in os.listdir(here):
        link = "/uploads/explorer.py?path=" + here + "/" + name
        print('<p><a href="' + link + '" target="_blank">' + name + "</a></p>")
else:
    print("<pre>" + open(here).read() + "</pre>")
