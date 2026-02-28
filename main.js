'use strict';

const { Plugin, PluginSettingTab, Setting, Notice, normalizePath } = require('obsidian');

const DEFAULT_SETTINGS = {
  homepagePath: '홈/홈페이지',
  newsFolder: '3. 뉴스읽기',
  formLink: '',
};

module.exports = class ClassHomepageBratLite extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'open-class-homepage',
      name: '학급 홈페이지 열기',
      callback: () => this.openHomepage(),
    });

    this.addCommand({
      id: 'append-today-notice-section',
      name: '오늘 공지 섹션 추가',
      callback: () => this.appendTodayNoticeSection(),
    });

    this.addCommand({
      id: 'create-news-reading-template',
      name: '뉴스읽기 템플릿 생성',
      callback: () => this.createNewsReadingTemplate(),
    });

    this.addRibbonIcon('home', '학급 홈페이지 열기', () => this.openHomepage());
    this.addSettingTab(new ClassHomepageSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getNormalizedPath() {
    const raw = (this.settings.homepagePath || '').trim() || '홈/홈페이지';
    const withExt = raw.endsWith('.md') ? raw : `${raw}.md`;
    return normalizePath(withExt.replace(/\\/g, '/'));
  }

  getTemplate() {
    return [
      '# 🏫 학급 홈페이지',
      '',
      '> [!info] 안내',
      '> - 대상: 우리 반 학생/학부모',
      '> - 업데이트: 수시',
      '> - 문의: 담임에게 DM',
      '',
      '## 🔔 오늘 공지',
      '- [ ] 공지 1 입력',
      '- [ ] 공지 2 입력',
      '',
      '## 📅 이번 주 일정',
      '- 월:',
      '- 화:',
      '- 수:',
      '- 목:',
      '- 금:',
      '',
      '## 📝 과제 안내',
      '- 과목 | 과제 | 마감 | 제출',
      '- 국어 | 예시 과제 | 03/05 | [제출 링크]()',
      '',
      '## ✅ 준비물 체크',
      '- [ ] 실내화',
      '- [ ] 필기구',
      '- [ ] 교과서',
      '',
      '## 🔗 빠른 이동',
      '- [[1. 공지사항]]',
      '- [[2. 주간학습안내]]',
      '- [[3. 뉴스읽기]]',
      '- [[4. 수업활동]]',
      '- [[5. 설문]]',
      '',
      '## 📦 자료실',
      '- 수업자료:',
      '- 안내문:',
      '',
      '## 💬 질문/건의',
      '- 익명 폼: [링크]()',
      '',
    ].join('\n');
  }

  async ensureParentFolder(path) {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash <= 0) return;

    const folderPath = path.substring(0, lastSlash);
    const exists = this.app.vault.getAbstractFileByPath(folderPath);
    if (!exists) {
      await this.app.vault.createFolder(folderPath);
    }
  }

  async ensureFolder(folderPath) {
    const normalized = normalizePath((folderPath || '').replace(/\\/g, '/'));
    if (!normalized) return;
    if (!this.app.vault.getAbstractFileByPath(normalized)) {
      await this.app.vault.createFolder(normalized);
    }
  }

  async getOrCreateHomepageFile() {
    const normalized = this.getNormalizedPath();
    let file = this.app.vault.getAbstractFileByPath(normalized);

    if (!file) {
      await this.ensureParentFolder(normalized);
      file = await this.app.vault.create(normalized, this.getTemplate());
      new Notice(`홈페이지 노트를 새로 만들었습니다: ${normalized}`);
      await this.ensureCoreFolders();
    }

    return { file, normalized };
  }

  async ensureCoreFolders() {
    const folders = ['1. 공지사항', '2. 주간학습안내', '3. 뉴스읽기', '4. 수업활동', '5. 설문'];
    for (const f of folders) {
      await this.ensureFolder(f);
    }
  }

  async openHomepage() {
    try {
      const { file } = await this.getOrCreateHomepageFile();
      await this.ensureCoreFolders();
      await this.app.workspace.getLeaf(true).openFile(file);
      new Notice('학급 홈페이지를 열었습니다.');
    } catch (e) {
      new Notice('홈페이지를 열지 못했습니다. 설정의 경로를 확인해 주세요.');
      console.error('[class-homepage-brat-lite] openHomepage error', e);
    }
  }

  async appendTodayNoticeSection() {
    try {
      const { file } = await this.getOrCreateHomepageFile();
      const now = window.moment ? window.moment().format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10);
      const block = `\n## 🔔 오늘 공지 (${now})\n- [ ] 공지 입력\n`;
      const old = await this.app.vault.read(file);
      await this.app.vault.modify(file, old + block);
      await this.app.workspace.getLeaf(true).openFile(file);
      new Notice('오늘 공지 섹션을 추가했습니다.');
    } catch (e) {
      new Notice('오늘 공지 섹션 추가에 실패했습니다.');
      console.error('[class-homepage-brat-lite] appendTodayNoticeSection error', e);
    }
  }

  async createNewsReadingTemplate() {
    try {
      const now = window.moment ? window.moment().format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10);
      const newsFolder = (this.settings.newsFolder || '3. 뉴스읽기').trim();
      await this.ensureFolder(newsFolder);

      const notePath = normalizePath(`${newsFolder}/${now}-뉴스읽기.md`);
      let file = this.app.vault.getAbstractFileByPath(notePath);
      if (!file) {
        const formLink = (this.settings.formLink || '').trim();
        const template = [
          '---',
          'category: 3. 뉴스읽기',
          'priority: HIGH',
          'tags: [뉴스읽기, 시사, 토론]',
          `created: ${now}`,
          '---',
          '',
          `# 뉴스읽기 - ${now}`,
          '',
          '## 기사 정보',
          '- 제목: ',
          '- 출처: ',
          '- 링크: ',
          '',
          '## 핵심 내용 요약',
          '- ',
          '',
          '## 생각해보기',
          '1. 기사에서 가장 중요한 주장은?',
          '2. 그 근거는 충분한가?',
          '3. 내 의견은?',
          '',
          '## 제출',
          formLink ? `- 구글폼: ${formLink}` : '- 구글폼: [링크를 설정에서 입력하세요]()',
          '',
        ].join('\n');

        file = await this.app.vault.create(notePath, template);
        new Notice(`뉴스읽기 템플릿을 만들었습니다: ${notePath}`);
      } else {
        new Notice(`이미 존재하는 템플릿입니다: ${notePath}`);
      }

      await this.app.workspace.getLeaf(true).openFile(file);
    } catch (e) {
      new Notice('뉴스읽기 템플릿 생성에 실패했습니다.');
      console.error('[class-homepage-brat-lite] createNewsReadingTemplate error', e);
    }
  }
};

class ClassHomepageSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Class Homepage BRAT Lite 설정' });

    new Setting(containerEl)
      .setName('홈페이지 노트 경로')
      .setDesc('예: 홈/홈페이지 (확장자 .md는 자동 처리)')
      .addText((text) =>
        text
          .setPlaceholder('홈/홈페이지')
          .setValue(this.plugin.settings.homepagePath)
          .onChange(async (value) => {
            this.plugin.settings.homepagePath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('뉴스읽기 폴더')
      .setDesc('예: 3. 뉴스읽기')
      .addText((text) =>
        text
          .setPlaceholder('3. 뉴스읽기')
          .setValue(this.plugin.settings.newsFolder)
          .onChange(async (value) => {
            this.plugin.settings.newsFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('구글폼 링크')
      .setDesc('뉴스읽기 템플릿 하단 제출 링크')
      .addText((text) =>
        text
          .setPlaceholder('https://forms.gle/...')
          .setValue(this.plugin.settings.formLink)
          .onChange(async (value) => {
            this.plugin.settings.formLink = value.trim();
            await this.plugin.saveSettings();
          })
      );
  }
}
