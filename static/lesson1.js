// Vue показывает форму и отправляет данные обработчику handlers/lesson1.py.
Vue.createApp({
    template: `
        <h2>Форма на Vue</h2>
        <p class="hint">Логин: <b>artem</b> или <b>kirill</b>. Пароль: <b>1234</b>.</p>
        <form @submit.prevent="signIn">
            <label>Логин
                <input v-model="login" @input="clearResult" name="login" autocomplete="username" required>
            </label>
            <label>Пароль
                <input v-model="password" @input="clearResult" name="password" type="text" autocomplete="current-password" required>
            </label>
            <button type="submit" :disabled="loading">
                <span v-text="loading ? 'Проверяем…' : 'Войти'"></span>
            </button>
        </form>
        <h3>Сам SQL-запрос</h3>
        <pre class="sql-query query-text"><code class="hljs language-sql" v-text="query || previewQuery"></code></pre>
        <h3>Вывод этого запроса через v-html</h3>
        <pre class="sql-query query-html"><code class="hljs language-sql" v-html="query || previewQuery"></code></pre>
        <p class="result" aria-live="polite" v-text="message"></p>
        <div v-if="user" class="profile">
            <h3 v-text="user.name"></h3>
            <p>Логин: <b v-text="user.login"></b></p>
            <p><b>О пользователе:</b></p>
            <p class="about" v-text="user.about || 'Описание пока не добавлено.'"></p>
        </div>
    `,
    data() {
        return { login: '', password: '', message: '', query: '', user: null, loading: false };
    },
    computed: {
        previewQuery() {
            return `SELECT login, name, about FROM users WHERE login = '${this.login}' AND password = '${this.password}'`;
        }
    },
    methods: {
        clearResult() {
            this.query = '';
            this.message = '';
            this.user = null;
        },
        async signIn() {
            this.loading = true;
            this.message = '';
            this.query = '';
            this.user = null;
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    body: new URLSearchParams({ login: this.login, password: this.password })
                });
                if (!response.ok) throw new Error('Ошибка сервера');
                const result = await response.json();
                this.message = result.message;
                this.query = result.query;
                this.user = result.user;
            } catch {
                this.message = 'Нет ответа от Python. Проверь, запущена ли программа.';
            } finally {
                this.loading = false;
            }
        }
    }
}).mount('#lesson-app');
