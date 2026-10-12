import { isV2Schema, validateSchema } from "./validator.js";

// What `ramoira push` sends, decided before any network call (roadmap C4,
// D20). A push takes a valid 3.x full schema and uploads it as a private,
// proposed version; only the owner, in the review on ramoira.com, makes a
// version public. The slug is ramoira.brand_id.

const MIGRATION_GUIDE = "https://github.com/ramoira/brand-schema-spec/blob/main/migrations/2.0.0-to-3.0.0.md";
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,62})[a-z0-9]$/;

export type PushPlan =
  | {
      ok: true;
      slug: string;
      schemaVersion: string;
      contentHash: string;
      /** brand_id was empty: the slug is written into the file (outside content_hash) before pushing. */
      setsBrandId: boolean;
    }
  | { ok: false; message: string; details?: string[] };

/** `slug` comes from --slug, or the project's ramoira/sync.json. */
export function planPush(schema: unknown, slug?: string | null): PushPlan {
  if (isV2Schema(schema)) {
    return { ok: false, message: `This is a 2.0.0 schema. Ramoira takes 3.x; see ${MIGRATION_GUIDE}` };
  }
  const result = validateSchema(schema);
  if (result.kind && result.kind !== "full") {
    return {
      ok: false,
      message:
        result.kind === "summary"
          ? "Push the full schema. Ramoira extracts the public summary itself and keeps the full schema private."
          : `A ${result.kind} cannot be pushed; push your brand's full schema.`,
    };
  }
  if (!result.valid) {
    return { ok: false, message: "The schema is not valid. Fix these first (ramoira validate shows them all):", details: result.errors.slice(0, 10) };
  }
  const ramoira = (schema as { ramoira: Record<string, any> }).ramoira;
  if (ramoira.ratification !== null) {
    return {
      ok: false,
      message: "ramoira.ratification must be null. A ratification is recorded by Ramoira when the brand ratifies; it is not carried in a file.",
    };
  }
  const named: string | null = ramoira.brand_id || null;
  if (named && slug && named !== slug) {
    return { ok: false, message: `The schema's ramoira.brand_id is "${named}", not "${slug}". Change one of them so they match.` };
  }
  const target = named ?? slug ?? null;
  if (!target) {
    return { ok: false, message: 'Name the brand\'s slug: ramoira push --slug your-brand (lowercase letters, digits and hyphens).' };
  }
  if (!SLUG.test(target) || target.includes("--")) {
    return { ok: false, message: `"${target}" is not a slug: 3–64 lowercase letters, digits and hyphens, starting and ending with a letter or digit.` };
  }
  return { ok: true, slug: target, schemaVersion: ramoira.schema_version, contentHash: ramoira.content_hash, setsBrandId: !named };
}
