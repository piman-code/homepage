export type QuartzPlugin = Record<string, unknown>

export type QuartzConfig = {
  configuration: {
    pageTitle: string
    pageTitleSuffix?: string
    enableSPA?: boolean
    enablePopovers?: boolean
    analytics?: unknown
    locale?: string
    baseUrl?: string
    ignorePatterns?: string[]
    defaultDateType?: string
    generateSocialImages?: boolean
    theme?: Record<string, unknown>
  }
  plugins: {
    transformers: QuartzPlugin[]
    filters: QuartzPlugin[]
    emitters: QuartzPlugin[]
  }
}

export type SharedLayout = {
  head?: unknown
  header?: unknown[]
  beforeBody?: unknown[]
  afterBody?: unknown[]
  left?: unknown[]
  right?: unknown[]
  footer?: unknown
}

export type PageLayout = {
  beforeBody?: unknown[]
  left?: unknown[]
  right?: unknown[]
}
