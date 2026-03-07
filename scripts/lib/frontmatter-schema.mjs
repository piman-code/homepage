export const requiredFields = ["title", "date", "category", "tags", "published", "pin"]

export const allowedCategories = new Set([
  "home",
  "notice",
  "lesson",
  "assignment",
  "schedule",
  "newsletter",
  "faq",
  "resource",
  "ai-assistant",
])

export const allowedVisibility = new Set(["public", "internal"])
export const allowedSafetyLevels = new Set(["school-default", "restricted"])

export const pathCategoryRules = [
  { prefix: "notices/", category: "notice" },
  { prefix: "lessons/", category: "lesson" },
  { prefix: "assignments/", category: "assignment" },
  { prefix: "schedule/", category: "schedule" },
  { prefix: "newsletters/", category: "newsletter" },
  { prefix: "faq/", category: "faq" },
  { prefix: "resources/", category: "resource" },
  { prefix: "ai-assistant/", category: "ai-assistant" },
]

export const schemaDefaults = {
  visibility: "public",
  rag_enabled: true,
  safety_level: "school-default",
}

export const assignmentRequiredFields = ["due"]
