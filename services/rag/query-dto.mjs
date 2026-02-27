export const DEFAULT_QUERY_LIMITS = {
  questionMin: 2,
  questionMax: 500,
  subjectMax: 30,
  gradeMax: 20,
  unitMax: 80,
}

export const DEFAULT_QUERY_OPTIONS = {
  subject: ["공통", "과학", "영어"],
  grade: ["1학년", "2학년", "3학년", "중1", "중2", "중3"],
  unit: ["수업 전반", "1단원", "2단원", "3단원"],
}

export function validateQueryInputDto(input, { limits = DEFAULT_QUERY_LIMITS, options = DEFAULT_QUERY_OPTIONS } = {}) {
  const errors = []
  const dto = {}

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      errors: [{ field: "input", message: "input must be an object" }],
      value: null,
    }
  }

  const question = normalizeString(input.question)
  if (!question) {
    errors.push({ field: "question", message: "question is required" })
  } else {
    if (question.length < limits.questionMin || question.length > limits.questionMax) {
      errors.push({
        field: "question",
        message: `question length must be between ${limits.questionMin} and ${limits.questionMax}`,
      })
    }
    dto.question = question
  }

  const optionSets = toOptionSets(options)
  validateOptionalField({
    field: "subject",
    inputValue: input.subject,
    maxLength: limits.subjectMax,
    optionSet: optionSets.subject,
    dto,
    errors,
  })
  validateOptionalField({
    field: "grade",
    inputValue: input.grade,
    maxLength: limits.gradeMax,
    optionSet: optionSets.grade,
    dto,
    errors,
  })
  validateOptionalField({
    field: "unit",
    inputValue: input.unit,
    maxLength: limits.unitMax,
    optionSet: optionSets.unit,
    dto,
    errors,
  })

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? dto : null,
  }
}

export function parseQueryInputDto(input, options) {
  const result = validateQueryInputDto(input, options)
  if (result.valid) {
    return result.value
  }

  const reasons = result.errors.map((error) => `${error.field}: ${error.message}`).join(", ")
  throw new Error(`Invalid query input DTO: ${reasons}`)
}

function validateOptionalField({ field, inputValue, maxLength, optionSet, dto, errors }) {
  if (inputValue === undefined || inputValue === null || inputValue === "") {
    return
  }

  if (typeof inputValue !== "string") {
    errors.push({ field, message: `${field} must be a string when provided` })
    return
  }

  const value = inputValue.trim()
  if (!value) {
    return
  }

  if (value.length > maxLength) {
    errors.push({ field, message: `${field} must be ${maxLength} characters or fewer` })
    return
  }

  if (optionSet && optionSet.size > 0 && !optionSet.has(value)) {
    errors.push({
      field,
      message: `${field} must be one of ${Array.from(optionSet).join(", ")}`,
    })
    return
  }

  dto[field] = value
}

function toOptionSets(options = {}) {
  return {
    subject: toSet(options.subject),
    grade: toSet(options.grade),
    unit: toSet(options.unit),
  }
}

function toSet(values) {
  if (!Array.isArray(values)) return null
  return new Set(
    values
      .map((value) => normalizeString(value))
      .filter(Boolean),
  )
}

function normalizeString(value) {
  if (typeof value !== "string") return ""
  return value.trim()
}
