// Показываем, что браузер отправил серверу вместе с запросом.
Vue.createApp({
    template: `
        <h2>Что браузер шлёт на сервер</h2>
        <p class="hint">Ты только открыл страницу — а браузер уже рассказал серверу кучу всего о себе. Вот что пришло с этим запросом.</p>
        <button type="button" @click="load">Обновить</button>

        <p class="result">Твой адрес (IP): <b v-text="ip"></b></p>

        <div class="table-scroll" v-if="headers.length">
            <table>
                <tr><th>Заголовок</th><th>Значение</th></tr>
                <tr v-for="header in headers" :key="header.name">
                    <td v-text="header.name"></td>
                    <td v-text="header.value"></td>
                </tr>
            </table>
        </div>

        <h3>Что тут интересного</h3>
        <p class="hint">User-Agent — какой у тебя браузер и система. Accept-Language — язык. Cookie — куки из урока 6. Сервер видит это у каждого посетителя.</p>
    `,
    data() {
        return { ip: '', headers: [] };
    },
    mounted() {
        this.load();
    },
    methods: {
        async load() {
            const response = await fetch('/run/9');
            const result = await response.json();
            this.ip = result.ip;
            this.headers = result.headers;
        }
    }
}).mount('#lesson-app');
