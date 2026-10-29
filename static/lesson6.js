// Вход через куку: сайт запоминает логин в браузере.
Vue.createApp({
    template: `
        <h2>Куки: как сайт помнит вход</h2>
        <p class="hint">Логин: <b>artem</b> или <b>kirill</b>. Пароль: <b>1234</b>.</p>
        <form @submit.prevent="signIn">
            <label>Логин
                <input v-model="login" required>
            </label>
            <label>Пароль
                <input v-model="password" type="text" required>
            </label>
            <button type="submit">Войти</button>
        </form>
        <p class="result" aria-live="polite" v-text="message"></p>
        <div class="profile" v-if="cookie">
            <p>Кука в браузере: <b>user = <span v-text="cookie"></span></b></p>
        </div>

        <h3>Фокус: подделай куку</h3>
        <p class="hint">Нажми F12 → вкладка Application → Cookies → 127.0.0.1. Поменяй значение user с artem на kirill и обнови страницу. Сайт поверит куке и назовёт тебя Кириллом — без пароля.</p>
        <p class="hint">Вывод: кука — это просто текст из браузера. Доверять ей как доказательству, кто ты, нельзя.</p>
    `,
    data() {
        return { login: '', password: '', message: '', cookie: '' };
    },
    mounted() {
        this.load();
    },
    methods: {
        async load() {
            const response = await fetch('/run/6');
            const result = await response.json();
            this.message = result.message;
            this.cookie = result.cookie;
        },
        async signIn() {
            const response = await fetch('/run/6', {
                method: 'POST',
                body: new URLSearchParams({ login: this.login, password: this.password })
            });
            const result = await response.json();
            this.message = result.message;
            this.cookie = result.cookie;
        }
    }
}).mount('#lesson-app');
