// Quartz 4 layout placeholder for this scaffold.
// Navigation is wired to required IA paths.

import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const navLinks = {
  "홈": "/",
  "공지": "/notices/",
  "수업자료": "/lessons/",
  "과제": "/assignments/",
  "일정": "/schedule/",
  "가정통신문": "/newsletters/",
  "FAQ": "/faq/",
  "자료실": "/resources/",
}

export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [
    Component.PageTitle(),
    Component.Spacer(),
    Component.Search(),
    Component.Explorer(),
  ],
  beforeBody: [Component.Breadcrumbs()],
  afterBody: [Component.Backlinks()],
  left: [Component.DesktopOnly(Component.Explorer())],
  right: [Component.Graph(), Component.DesktopOnly(Component.TableOfContents())],
  footer: Component.Footer({ links: navLinks }),
}

export const defaultContentPageLayout: PageLayout = {
  beforeBody: [Component.ArticleTitle(), Component.ContentMeta(), Component.TagList()],
  left: [],
  right: [],
}

export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.ArticleTitle(), Component.ContentMeta()],
  left: [],
  right: [],
}
