'use strict';

const { Plugin, PluginSettingTab, Setting, Notice, normalizePath } = require('obsidian');
const { ClassHomepageCore, DEFAULT_SETTINGS, getCommandDefinitions } = require('./plugin-core.cjs');

module.exports = class ClassHomepageBratLite extends Plugin {
  async onload() {
    await this.loadSettings();
    this.rebuildCore();

    for (const command of getCommandDefinitions(this.core)) {
      this.addCommand({
        id: command.id,
        name: command.name,
        callback: async () => {
          await this.executeCommand(command);
        },
      });
    }

    this.addRibbonIcon('home', '학급 홈페이지 열기', async () => {
      const command = getCommandDefinitions(this.core).find((item) => item.id === 'open-class-homepage');
      if (command) {
        await this.executeCommand(command);
      }
    });

    this.addSettingTab(new ClassHomepageSettingTab(this.app, this));
  }

  rebuildCore() {
    this.core = new ClassHomepageCore({
      app: this.app,
      settings: this.settings,
      normalizePath,
      now: () => new Date(),
    });
  }

  async executeCommand(command) {
    try {
      const result = await command.run();
      if (result && result.notice) {
        new Notice(result.notice);
      }
    } catch (error) {
      console.error('[class-homepage-brat-lite] command error', command.id, error);
      new Notice(`${command.name} 실행 중 오류가 발생했습니다.`);
    }
  }

  async ensureInitialStructureSafe() {
    try {
      const summary = await this.core.createInitialStructure({ overwrite: false, backup: false });
      new Notice(`초기 구조 생성 완료: 폴더 ${summary.folderCreated}개, 파일 ${summary.fileCreated}개 생성`);
    } catch (error) {
      console.error('[class-homepage-brat-lite] ensureInitialStructureSafe error', error);
      new Notice('초기 구조 생성에 실패했습니다.');
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
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
      .setDesc('예: 홈/홈페이지.md (슬래시/백슬래시 모두 허용)')
      .addText((text) =>
        text
          .setPlaceholder('홈/홈페이지.md')
          .setValue(this.plugin.settings.homepagePath)
          .onChange(async (value) => {
            this.plugin.settings.homepagePath = value.trim();
            await this.plugin.saveSettings();
            this.plugin.rebuildCore();
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
            this.plugin.rebuildCore();
          })
      );

    new Setting(containerEl)
      .setName('구글폼 링크')
      .setDesc('뉴스읽기 템플릿/오늘자 과제의 제출 섹션에 자동 삽입')
      .addText((text) =>
        text
          .setPlaceholder('https://forms.gle/...')
          .setValue(this.plugin.settings.formLink)
          .onChange(async (value) => {
            this.plugin.settings.formLink = value.trim();
            await this.plugin.saveSettings();
            this.plugin.rebuildCore();
          })
      );

    new Setting(containerEl)
      .setName('초기 구조 생성')
      .setDesc('기존 파일은 유지하고 누락된 기본 폴더/파일만 생성합니다.')
      .addButton((button) =>
        button.setButtonText('초기 구조 생성').setCta().onClick(async () => {
          await this.plugin.ensureInitialStructureSafe();
        })
      );
  }
}
