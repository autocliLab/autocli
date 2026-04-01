import type { ZodType } from 'zod'

export function zodToJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
  const def = (schema as unknown as { _def: Record<string, unknown> })._def

  if (!def) return { type: 'object' }

  const typeName = def.typeName as string

  switch (typeName) {
    case 'ZodObject': {
      const shape = (schema as unknown as { shape: Record<string, ZodType<unknown>> }).shape
      const properties: Record<string, unknown> = {}
      const required: string[] = []

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value)
        const innerDef = (value as unknown as { _def: Record<string, unknown> })._def
        if (innerDef.typeName !== 'ZodOptional' && innerDef.typeName !== 'ZodDefault' && innerDef.typeName !== 'ZodNullable') {
          required.push(key)
        }
      }

      return { type: 'object', properties, required }
    }
    case 'ZodString': {
      const result: Record<string, unknown> = { type: 'string' }
      if (def.description) result.description = def.description as string
      return result
    }
    case 'ZodNumber': {
      const result: Record<string, unknown> = { type: 'number' }
      if (def.description) result.description = def.description as string
      return result
    }
    case 'ZodBoolean': {
      const result: Record<string, unknown> = { type: 'boolean' }
      if (def.description) result.description = def.description as string
      return result
    }
    case 'ZodArray':
      return { type: 'array', items: zodToJsonSchema(def.type as ZodType<unknown>) }
    case 'ZodOptional':
      return zodToJsonSchema(def.innerType as ZodType<unknown>)
    case 'ZodNullable': {
      const inner = zodToJsonSchema(def.innerType as ZodType<unknown>)
      return { ...inner, nullable: true }
    }
    case 'ZodEnum':
      return { type: 'string', enum: (def as unknown as { values: string[] }).values }
    case 'ZodLiteral':
      return { type: typeof def.value === 'number' ? 'number' : 'string', const: def.value }
    case 'ZodUnion': {
      const options = (def as unknown as { options: ZodType<unknown>[] }).options
      return { anyOf: options.map(o => zodToJsonSchema(o)) }
    }
    case 'ZodDefault':
      return zodToJsonSchema(def.innerType as ZodType<unknown>)
    case 'ZodEffects':
      return zodToJsonSchema(def.schema as ZodType<unknown>)
    case 'ZodRecord':
      return { type: 'object', additionalProperties: zodToJsonSchema(def.valueType as ZodType<unknown>) }
    default:
      return { type: 'string' }
  }
}
