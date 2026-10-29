// Показываем пароли из базы и их хеши.
Vue.createApp({
    template: `
        <h2>Пароли: открытый текст и хеш</h2>
        <p class="hint">Сейчас в базе пароли лежат открытым текстом. Кто получит базу — узнает все пароли сразу.</p>
        <button type="button" @click="load">Показать пароли</button>

        <div class="table-scroll" v-if="users.length">
            <table>
                <tr><th>login</th><th>пароль (как в базе)</th><th>хеш SHA-256</th></tr>
                <tr v-for="user in users" :key="user.login">
                    <td v-text="user.login"></td>
                    <td v-text="user.password"></td>
                    <td v-text="user.hash"></td>
                </tr>
            </table>
        </div>

        <h3>Как правильно</h3>
        <p class="hint">В настоящем приложении в базе хранят не пароль, а его хеш — длинный «отпечаток». При входе сравнивают хеши. Если базу украдут, пароли по хешам сразу не прочитать.</p>
        <p class="hint">Заметь: у artem и kirill пароль 1234, и хеши одинаковые. Значит, по хешу видно, что пароли совпадают. Поэтому к паролю ещё добавляют случайную «соль».</p>
    `,
    data() {
        return { users: [] };
    },
    methods: {
        async load() {
            const response = await fetch('/run/8');
            const result = await response.json();
            this.users = result.users;
        }
    }
}).mount('#lesson-app');
