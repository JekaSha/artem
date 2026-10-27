// Vue отправляет слово поиска обработчику handlers/lesson2.py.
Vue.createApp({
    template: `
        <h2>Поиск по логину</h2>
        <p class="hint">Введи логин или его часть. Например, <b>art</b> найдёт пользователя <b>artem</b>.</p>
        <form @submit.prevent="search">
            <label>Что ищем?
                <input v-model="word" @input="clearResult" name="word" type="search" placeholder="Например: kir" required>
            </label>
            <button type="submit" :disabled="loading">
                <span v-text="loading ? 'Ищем…' : 'Найти'"></span>
            </button>
        </form>
        <p class="hint" v-if="word">
            <b>Ссылка на этот поиск:</b><br>
            <a :href="searchUrl" v-text="searchUrl" style="overflow-wrap: anywhere"></a>
        </p>
        <p class="user-query"><strong>Ваш запрос:</strong> <span v-html="word"></span></p>
        <h3>Сам SQL-запрос</h3>
        <pre class="sql-query query-text"><code class="hljs language-sql" v-text="query || previewQuery"></code></pre>
        <p class="result" aria-live="polite" v-text="message"></p>
        <div v-if="query">
            <h3>Результат поиска</h3>
            <div v-if="rows.length" class="table-scroll">
                <table>
                    <thead><tr><th>login</th><th>name</th><th>about</th></tr></thead>
                    <tbody>
                        <tr v-for="(row, index) in rows" :key="index">
                            <td v-for="(value, column) in row" :key="column" v-text="value"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p class="hint" v-else>Нет пользователей для показа.</p>
        </div>
    `,
    data() {
        const word = new URLSearchParams(window.location.search).get('word') || '';
        return { word, message: '', query: '', rows: [], loading: false };
    },
    mounted() {
        if (this.word.trim()) this.search();
    },
    computed: {
        searchUrl() {
            const url = new URL('/lessons/2', window.location.origin);
            url.searchParams.set('word', this.word);
            return url.href;
        },
        previewQuery() {
            return `SELECT login, name, about FROM users WHERE login LIKE '%${this.word.trim()}%'`;
        }
    },
    methods: {
        clearResult() {
            this.query = '';
            this.message = '';
            this.rows = [];
        },
        async search() {
            this.loading = true;
            this.message = '';
            this.query = '';
            this.rows = [];
            // Сохраняем поиск в адресной строке: ссылку можно скопировать.
            window.history.replaceState(null, '', this.searchUrl);
            try {
                const params = new URLSearchParams({ word: this.word });
                const response = await fetch('/search?' + params);
                if (!response.ok) throw new Error('Ошибка сервера');
                const result = await response.json();
                this.message = result.message;
                this.query = result.query;
                this.rows = result.rows;
            } catch {
                this.message = 'Нет ответа от Python. Проверь, запущена ли программа.';
            } finally {
                this.loading = false;
            }
        }
    }
}).mount('#lesson-app');
