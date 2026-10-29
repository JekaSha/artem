// Гостевая книга: сообщения сохраняются и показываются всем через v-html.
Vue.createApp({
    template: `
        <h2>Гостевая книга</h2>
        <p class="hint">Напиши сообщение — его увидят все, кто откроет страницу. Сообщения хранятся в базе.</p>
        <form @submit.prevent="send">
            <label>Сообщение
                <input v-model="text" required>
            </label>
            <button type="submit">Отправить</button>
        </form>

        <h3>Все сообщения</h3>
        <p class="hint" v-if="!messages.length">Пока пусто. Оставь первое сообщение!</p>
        <div class="profile" v-for="(message, index) in messages" :key="index">
            <div class="about" v-html="message"></div>
        </div>

        <h3>Где здесь опасность (XSS)</h3>
        <p class="hint">Сообщения выводятся через v-html, поэтому HTML внутри становится настоящим. Попробуй отправить: <b>&lt;b&gt;жирный текст&lt;/b&gt;</b> — он станет жирным.</p>
        <p class="hint">А теперь: <b>&lt;img src=x onerror="alert('взлом')"&gt;</b>. Картинки нет, поэтому сработает onerror и выскочит окно — у каждого, кто откроет страницу. Это и есть XSS: чужой код выполняется в чужом браузере.</p>
    `,
    data() {
        return { text: '', messages: [] };
    },
    mounted() {
        this.load();
    },
    methods: {
        async load() {
            const response = await fetch('/run/7');
            const result = await response.json();
            this.messages = result.messages;
        },
        async send() {
            const response = await fetch('/run/7', {
                method: 'POST',
                body: new URLSearchParams({ text: this.text })
            });
            const result = await response.json();
            this.messages = result.messages;
            this.text = '';
        }
    }
}).mount('#lesson-app');
