import { isV2Schema, validateSchema } from "./validator.js";

// What `ramoira publish` sends, decided before any network call (roadmap C4).
// Publishing takes a 3.0.0 full schema; the slug is ramoira.brand_id.

const MIGRATION_GUIDE = "https://github.com/ramoira/brand-schema-spec/blob/main/migrations/2.0.0-to-3.0.0.md";

export type PublishPlan =
  | { ok: true; slug: string; schemaVersion: string; contentHash: string }
  | { ok: false; message: string; details?: string[] };

export function planPublish(schema: unknown): PublishPlan {
  if (isV2Schema(schema)) {
    return { ok: false, message: `This is a 2.0.0 schema. Publishing takes 3.0.0; see ${MIGRATION_GUIDE}` };
  }
  const result = validateSchema(schema);
  if (result.kind && result.kind !== "full") {
    return {
      ok: false,
      message:
        result.kind === "summary"
          ? "Publish the full schema. Ramoira extracts the public summary itself and keeps the full schema private."
          : `A ${result.kind} cannot be published; publish your brand's full schema.`,
    };
  }
  if (!result.valid) {
    return { ok: false, message: "The schema is not valid 3.0.0. Fix these first (ramoira validate shows them all):", details: result.errors.slice(0, 10) };
  }
  const ramoira = (schema as { ramoira: Record<string, any> }).ramoira;
  if (!ramoira.brand_id) {
    return { ok: false, message: 'Set ramoira.brand_id to your slug (lowercase letters, digits, hyphens), e.g. "your-brand".' };
  }
  if (ramoira.ratification !== null) {
    return {
      ok: false,
      message: "ramoira.ratification must be null. A ratification is recorded by Ramoira when the brand ratifies; it is not carried in a published file.",
    };
  }
  return { ok: true, slug: ramoira.brand_id, schemaVersion: ramoira.schema_version, contentHash: ramoira.content_hash };
}
