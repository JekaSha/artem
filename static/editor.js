// Общий редактор настоящих файлов двух уроков.
(() => {
    const root = document.querySelector('#code-editor');
    const lesson = Number(root.dataset.lesson);
    const key = `lesson-editor:${lesson}:`;
    let editor;
    let loadingSource = false;
    let markedLine = null;

    Vue.createApp({
        data() {
            return {
                language: 'python', filePath: '', dirty: false, busy: true,
                status: '', hasError: false, saved: {}
            };
        },
        async mounted() {
            editor = CodeMirror.fromTextArea(this.$refs.source, {
                mode: 'python', theme: 'material-darker', lineNumbers: true,
                indentUnit: 4, tabSize: 4, viewportMargin: 10,
                extraKeys: { 'Ctrl-S': () => this.save(), 'Cmd-S': () => this.save() }
            });
            editor.on('change', () => {
                if (loadingSource) return;
                const source = editor.getValue();
                this.dirty = source !== this.saved[this.language];
                if (this.dirty) sessionStorage.setItem(key + this.language, source);
                else sessionStorage.removeItem(key + this.language);
                if (markedLine !== null) {
                    editor.removeLineClass(markedLine, 'background', 'syntax-error-line');
                    markedLine = null;
                }
            });
            await this.switchLanguage(sessionStorage.getItem(key + 'tab') || 'python');
            const notice = sessionStorage.getItem(key + 'notice');
            if (notice) {
                this.status = notice;
                sessionStorage.removeItem(key + 'notice');
            }
        },
        methods: {
            async switchLanguage(language) {
                this.busy = true;
                this.status = '';
                this.hasError = false;
                try {
                    const response = await fetch(`/editor/source?lesson=${lesson}&language=${language}`, { cache: 'no-store' });
                    if (!response.ok) throw new Error('Не удалось открыть файл.');
                    const result = await response.json();
                    this.language = language;
                    this.filePath = result.path;
                    this.saved[language] = result.source;
                    sessionStorage.setItem(key + 'tab', language);
                    const draft = sessionStorage.getItem(key + language);
                    loadingSource = true;
                    editor.setOption('mode', language === 'python' ? 'python' : 'javascript');
                    editor.setValue(draft === null ? result.source : draft);
                    loadingSource = false;
                    this.dirty = editor.getValue() !== result.source;
                    editor.refresh();
                } catch (error) {
                    this.status = error.message;
                    this.hasError = true;
                } finally {
                    this.busy = false;
                }
            },
            async send(action) {
                const response = await fetch('/editor/' + action, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lesson, language: this.language, source: editor.getValue() })
                });
                if (!response.ok) throw new Error('Не удалось выполнить действие.');
                const result = await response.json();
                this.hasError = !result.valid;
                this.status = result.message;
                if (result.line) {
                    markedLine = result.line - 1;
                    editor.addLineClass(markedLine, 'background', 'syntax-error-line');
                    editor.scrollIntoView({ line: markedLine, ch: 0 });
                }
                return result;
            },
            async check() {
                if (this.busy) return;
                this.busy = true;
                try {
                    await this.send('check');
                } catch (error) {
                    this.status = error.message;
                    this.hasError = true;
                } finally {
                    this.busy = false;
                }
            },
            async save() {
                if (this.busy) return;
                this.busy = true;
                try {
                    const result = await this.send('save');
                    if (result.valid) {
                        this.saved[this.language] = editor.getValue();
                        this.dirty = false;
                        sessionStorage.removeItem(key + this.language);
                        this.status = `Сохранено: ${result.path}.`;
                        if (this.language === 'vue') {
                            sessionStorage.setItem(key + 'notice', this.status);
                            window.location.reload();
                        } else {
                            this.status += ' Новый код уже используется при отправке формы.';
                        }
                    }
                } catch (error) {
                    this.status = error.message;
                    this.hasError = true;
                } finally {
                    this.busy = false;
                }
            }
        }
    }).mount(root);
})();
