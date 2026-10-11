import type {ZodType} from 'zod';

/** Readable "field: message" lines from a Zod parse. */
export const issuesOf = (schema: ZodType, value: unknown): string[] => {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`);
};
