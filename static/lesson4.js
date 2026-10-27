// Урок 4: описание профиля сохраняется через UPDATE.
Vue.createApp({
    template: `
        <h2>Карточка профиля</h2>
        <label>Пользователь
            <select v-model="login" @change="chooseProfile" name="profile-login" :disabled="loading">
                <option v-for="user in profiles" :key="user.login" :value="user.login" v-text="user.name + ' (' + user.login + ')'"></option>
            </select>
        </label>
        <article v-if="profile" class="profile profile-card">
            <h3 v-text="profile.name"></h3>
            <p>Логин: <b v-text="profile.login"></b></p>
            <p><b>О пользователе — about:</b></p>
            <div class="about" v-html="profile.about || 'Описание пока не заполнено.'"></div>
        </article>
        <p v-else class="hint">Профилей пока нет. Добавь пользователя в разделе SQL.</p>

        <h3>Изменить описание</h3>
        <form @submit.prevent="saveAbout">
            <label>О пользователе — about
                <textarea v-model="about" @input="clearResult" name="about" spellcheck="false" :disabled="!profile || loading"></textarea>
            </label>
            <div class="actions">
                <button type="submit" :disabled="!profile || loading">
                    <span v-text="loading ? 'Сохраняем…' : 'Сохранить описание'"></span>
                </button>
                <button type="button" :disabled="!profile || loading" @click="useExample">Подставить INSERT в about</button>
            </div>
        </form>
        <p class="hint">Обычный текст обновит описание. Пример сначала изменит about выбранного пользователя, а затем добавит нового — lesson4_user. Для повторной вставки укажи другой новый логин.</p>
        <h3>Сам SQL-запрос</h3>
        <pre class="sql-query query-text"><code class="hljs language-sql" v-text="query || previewQuery"></code></pre>
        <p class="result" aria-live="polite" v-text="message"></p>

        <div v-if="createdProfiles.length" class="created-profiles">
            <h3>Добавленные профили</h3>
            <article v-for="user in createdProfiles" :key="user.login" class="profile">
                <h3 v-text="user.name"></h3>
                <p>Логин: <b v-text="user.login"></b></p>
                <div class="about" v-html="user.about"></div>
                <button type="button" @click="openProfile(user.login)">Открыть этот профиль</button>
            </article>
        </div>

        <h3>Как это работает?</h3>
        <p class="hint">UPDATE меняет описание. В примере кавычка закрывает текст about, WHERE выбирает текущего пользователя, а ; завершает UPDATE. Следующая команда INSERT добавляет профиль. Два минуса -- скрывают хвост исходного запроса.</p>
        <p class="hint">Изменения сохраняются в users.db. Карточки показывают данные, которые Python заново прочитал из базы.</p>
    `,
    data() {
        return {
            profiles: [], login: '', about: '', query: '', message: '',
            createdProfiles: [], loading: true
        };
    },
    computed: {
        profile() {
            return this.profiles.find(user => user.login === this.login);
        },
        previewQuery() {
            return `UPDATE users SET about = '${this.about}' WHERE login = '${this.login}'`;
        }
    },
    mounted() {
        this.loadProfiles();
    },
    methods: {
        clearResult() {
            this.query = '';
            this.message = '';
            this.createdProfiles = [];
        },
        chooseProfile() {
            this.about = this.profile ? this.profile.about : '';
            this.clearResult();
        },
        openProfile(login) {
            this.login = login;
            this.chooseProfile();
        },
        useExample() {
            const login = this.login.replaceAll("'", "''");
            this.about = `Люблю Python' WHERE login = '${login}'; INSERT INTO users (login, password, name, about) VALUES ('lesson4_user', '1234', 'Новый ученик', 'Добавлен через обновление about.'); --`;
            this.clearResult();
        },
        async loadProfiles() {
            this.loading = true;
            try {
                const response = await fetch('/profile');
                if (!response.ok) throw new Error('Ошибка сервера');
                const result = await response.json();
                this.profiles = result.profiles || [];
                this.login = this.profiles.length ? this.profiles[0].login : '';
                this.chooseProfile();
                this.message = result.message;
            } catch {
                this.message = 'Не удалось загрузить профили.';
            } finally {
                this.loading = false;
            }
        },
        async saveAbout() {
            this.loading = true;
            this.query = '';
            this.message = '';
            this.createdProfiles = [];
            const previousLogins = new Set(this.profiles.map(user => user.login));
            try {
                const response = await fetch('/profile', {
                    method: 'POST',
                    body: new URLSearchParams({ login: this.login, about: this.about })
                });
                if (!response.ok) throw new Error('Ошибка сервера');
                const result = await response.json();
                this.query = result.query;
                this.message = result.message;
                this.profiles = result.profiles || [];
                this.createdProfiles = this.profiles.filter(user => !previousLogins.has(user.login));
            } catch {
                this.message = 'Нет ответа от Python. Проверь, запущена ли программа.';
            } finally {
                this.loading = false;
            }
        }
    }
}).mount('#lesson-app');
