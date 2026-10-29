// FormData передаёт выбранные файлы в Python без перезагрузки страницы.
Vue.createApp({
    template: `
        <h2>Загрузить файлы на сервер</h2>
        <p class="hint">Выбери картинки, документы, архивы или любые другие файлы. Можно выбрать несколько сразу.</p>
        <form @submit.prevent="upload" enctype="multipart/form-data">
            <label>Файлы с твоего компьютера
                <input ref="picker" name="files" type="file" multiple @change="chooseFiles" :disabled="loading">
            </label>
            <p class="hint" v-if="selected.length">Выбрано файлов: <span v-text="selected.length"></span></p>
            <button type="submit" :disabled="loading || !selected.length">
                <span v-text="loading ? 'Загружаем…' : 'Загрузить'"></span>
            </button>
        </form>
        <p class="result" aria-live="polite" v-text="message"></p>

        <div class="profile">
            <h3>Опасно: Python-файл выполнится на сервере</h3>
            <ol class="hint">
                <li>Загрузи файл <b>examples/stranger.py</b> из папки проекта.</li>
                <li>Открой адрес <a href="/uploads/stranger.py" target="_blank">/uploads/stranger.py</a>.</li>
                <li>Сервер запустит этот код, и ты увидишь «Меня загрузил кто-то чужой».</li>
            </ol>
            <pre>print("&lt;h1&gt;Меня загрузил кто-то чужой&lt;/h1&gt;")
print("&lt;p&gt;А сервер взял и выполнил мой Python-код.&lt;/p&gt;")</pre>
            <p class="hint">Так любой человек может загрузить свою программу и запустить её на чужом сервере.</p>
        </div>

        <h3>Всё, что загружено</h3>
        <p class="hint">Всего файлов на сервере: <b v-text="files.length"></b></p>
        <button type="button" :disabled="loading" @click="loadFiles">Обновить список</button>
        <p class="hint" v-if="!files.length">Пока файлов нет. Загрузи первый!</p>
        <div class="uploaded-files">
            <article class="uploaded-file" v-for="file in files" :key="file.name">
                <img v-if="file.image" :src="file.url" :alt="file.name">
                <h4 v-text="file.name"></h4>
                <p class="hint" v-text="formatSize(file.size)"></p>
                <div class="actions">
                    <a :href="file.url + '?download=1'" :download="file.name">Скачать файл</a>
                    <a v-if="file.python" :href="file.url" target="_blank">Открыть и выполнить Python</a>
                </div>
            </article>
        </div>
        <h3>Как это работает?</h3>
        <p class="hint">Браузер отправляет файлы через FormData. Python получает их из request.files и сохраняет в uploads. Список снизу читается из этой папки, поэтому останется после обновления страницы.</p>
        <p class="hint">У Python-файла есть ссылка «Открыть и выполнить Python». Сервер запускает .py, а вывод print() становится страницей в браузере. Если программа выводит HTML, он отобразится как HTML.</p>
    `,
    data() {
        return { selected: [], files: [], message: '', loading: false };
    },
    mounted() {
        this.loadFiles();
    },
    methods: {
        chooseFiles(event) {
            this.selected = Array.from(event.target.files);
            this.message = '';
        },
        formatSize(size) {
            if (size < 1024) return size + ' байт';
            if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' КБ';
            return (size / (1024 * 1024)).toFixed(1) + ' МБ';
        },
        async loadFiles() {
            this.loading = true;
            try {
                const response = await fetch('/files', { cache: 'no-store' });
                if (!response.ok) throw new Error('Ошибка сервера');
                const result = await response.json();
                this.files = result.files || [];
                this.message = result.message;
            } catch {
                this.message = 'Не удалось загрузить список файлов.';
            } finally {
                this.loading = false;
            }
        },
        async upload() {
            if (!this.selected.length) return;
            this.loading = true;
            this.message = '';
            const data = new FormData();
            for (const file of this.selected) data.append('files', file);
            try {
                const response = await fetch('/files', { method: 'POST', body: data });
                if (!response.ok) throw new Error('Ошибка сервера');
                const result = await response.json();
                this.files = result.files || [];
                this.message = result.message;
                this.selected = [];
                this.$refs.picker.value = '';
            } catch {
                this.message = 'Не удалось загрузить файлы. Проверь, запущен ли Python.';
            } finally {
                this.loading = false;
            }
        }
    }
}).mount('#lesson-app');
