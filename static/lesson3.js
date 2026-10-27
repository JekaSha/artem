// Урок 3: ввод из формы становится частью SQL-скрипта.
Vue.createApp({
    template: `
        <h2>Поиск, в который можно вставить INSERT</h2>
        <p class="hint">Кнопка «Подставить INSERT» заполнит поле примером. Затем нажми «Выполнить» — в users.db появится новый пользователь.</p>
        <form @submit.prevent="run">
            <label>Текст для поиска или SQL-инъекция
                <textarea v-model="word" @input="clearResult" name="word" spellcheck="false" required></textarea>
            </label>
            <div class="actions">
                <button type="button" :disabled="loading" @click="useExample">Подставить INSERT</button>
                <button type="submit" :disabled="loading">
                    <span v-text="loading ? 'Выполняем…' : 'Выполнить'"></span>
                </button>
            </div>
        </form>
        <p class="hint">Логин lesson3_user в примере должен быть новым. Для повторной вставки измени его на другой.</p>
        <p><strong>Ваш запрос:</strong> <span v-text="word"></span></p>
        <h3>Сам SQL-запрос</h3>
        <pre class="sql-query query-text"><code class="hljs language-sql" v-text="query || previewQuery"></code></pre>
        <p class="result" aria-live="polite" v-text="message"></p>

        <h3>Таблица users после выполнения</h3>
        <button type="button" :disabled="loading" @click="loadUsers">Обновить таблицу</button>
        <div class="table-scroll" v-if="columns.length">
            <table>
                <caption>Всего пользователей: <span v-text="rows.length"></span></caption>
                <thead><tr><th v-for="(column, index) in columns" :key="index" v-text="column"></th></tr></thead>
                <tbody>
                    <tr v-for="(row, index) in rows" :key="index">
                        <td v-for="(value, column) in row" :key="column" v-text="value === null ? 'NULL' : value"></td>
                    </tr>
                    <tr v-if="rows.length === 0"><td :colspan="columns.length">Таблица пуста.</td></tr>
                </tbody>
            </table>
        </div>
        <p class="hint" v-else>Таблица пока не загружена или недоступна.</p>

        <h3>Что происходит?</h3>
        <p class="hint">Одинарная кавычка ' закрывает текст поиска. Точка с запятой ; заканчивает первую команду. INSERT добавляет запись. Два минуса -- превращают оставшийся хвост запроса в комментарий.</p>
        <p class="hint">В Python используется executescript: он выполняет несколько команд. В уроке 2 execute разрешает только одну, поэтому такой INSERT там не выполнится.</p>
    `,
    data() {
        return {
            word: '', query: '', message: '', rows: [], columns: [], loading: false,
            example: "'; INSERT INTO users (login, password, name, about) VALUES ('lesson3_user', '1234', 'Ученик', 'Добавлен через SQL-инъекцию.'); --"
        };
    },
    mounted() {
        this.loadUsers();
    },
    computed: {
        previewQuery() {
            return `SELECT login, name, about FROM users WHERE login LIKE '%${this.word.trim()}%'`;
        }
    },
    methods: {
        clearResult() {
            this.query = '';
            this.message = '';
        },
        useExample() {
            this.word = this.example;
            this.clearResult();
        },
        async loadUsers() {
            this.loading = true;
            try {
                const response = await fetch('/sql/query', {
                    method: 'POST',
                    body: new URLSearchParams({ query: 'SELECT * FROM users' })
                });
                if (!response.ok) throw new Error('Ошибка сервера');
                const result = await response.json();
                this.columns = result.columns;
                this.rows = result.rows;
                if (!result.columns.length) this.message = result.message;
            } catch {
                this.message = 'Не удалось загрузить таблицу.';
            } finally {
                this.loading = false;
            }
        },
        async run() {
            this.loading = true;
            this.query = '';
            this.message = '';
            try {
                const response = await fetch('/injection', {
                    method: 'POST',
                    body: new URLSearchParams({ word: this.word })
                });
                if (!response.ok) throw new Error('Ошибка сервера');
                const result = await response.json();
                this.query = result.query;
                this.message = result.message;
                this.columns = result.columns || [];
                this.rows = result.rows;
            } catch {
                this.message = 'Нет ответа от Python. Проверь, запущена ли программа.';
            } finally {
                this.loading = false;
            }
        }
    }
}).mount('#lesson-app');
