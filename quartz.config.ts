// Quartz 4 configuration placeholder for this scaffold.
// When official Quartz runtime is synced, this file is used as-is.

import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "우리 반 학급 홈페이지",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "ko-KR",
    baseUrl: "<GITHUB_USERNAME>.github.io/class-homepage",
    ignorePatterns: ["private", "templates", "docs"],
    defaultDateType: "created",
    generateSocialImages: false,
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Noto Sans KR",
        body: "Noto Sans KR",
        code: "JetBrains Mono"
      },
      colors: {
        lightMode: {
          light: "#f8fafc",
          lightgray: "#e2e8f0",
          gray: "#64748b",
          darkgray: "#334155",
          dark: "#0f172a",
          secondary: "#1d4ed8",
          tertiary: "#0ea5e9",
          highlight: "#dbeafe",
          textHighlight: "#fef08a"
        },
        darkMode: {
          light: "#0f172a",
          lightgray: "#1e293b",
          gray: "#94a3b8",
          darkgray: "#cbd5e1",
          dark: "#f8fafc",
          secondary: "#60a5fa",
          tertiary: "#38bdf8",
          highlight: "#1e3a8a",
          textHighlight: "#facc15"
        }
      }
    }
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate(),
      Plugin.SyntaxHighlighting(),
      Plugin.ObsidianFlavoredMarkdown(),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({ enableSiteMap: true, enableRSS: true }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
