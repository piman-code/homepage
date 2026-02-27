'use strict';

const { Plugin, PluginSettingTab, Setting, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
  homepagePath: '홈/홈페이지',
};

module.exports = class ClassHomepageBratLite extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'open-class-homepage',
      name: '학급 홈페이지 열기',
      callback: () => this.openHomepage(),
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

  async openHomepage() {
    const raw = (this.settings.homepagePath || '').trim();
    const normalized = raw.endsWith('.md') ? raw : `${raw}.md`;
    const file = this.app.vault.getAbstractFileByPath(normalized);

    if (!file) {
      new Notice(`홈페이지 노트를 찾을 수 없습니다: ${normalized}`);
      return;
    }

    await this.app.workspace.getLeaf(true).openFile(file);
    new Notice('학급 홈페이지를 열었습니다.');
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
  }
}
