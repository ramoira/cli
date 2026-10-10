import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validateDocument } from "@ramoira/schema";
import specV2 from "../schemas/SPEC.schema.json";

// Validation here means schema validity: is this a well-formed schema under the
// spec? It is never "conformance", which means checking content against a
// ratified schema.

export interface ValidationIssue {
  level: "error" | "warning";
  path: string;
  message: string;
  /** The spec invariant (SPEC.md §12) behind the issue, when there is one. */
  invariant: number | null;
}

export interface ValidationResult {
  valid: boolean;
  /**
   * The document's own spec_version for v3 schemas ("3.0.0", "3.1.0"); "3.x" for
   * records and adoptions, which carry none; "2.0.0" for superseded schemas.
   */
  specVersion: string | null;
  /** full | summary | archetype | record | adoption for v3 documents. */
  kind: string | null;
  issues: ValidationIssue[];
  /** Error messages only, one line each (kept for existing callers). */
  errors: string[];
}

const ajvV2 = new Ajv2020({ allErrors: true });
addFormats(ajvV2);
const validateV2 = ajvV2.compile(specV2);

export function isV2Schema(doc: unknown): boolean {
  return Boolean(doc && typeof doc === "object" && !Array.isArray(doc) && "meta" in doc);
}

export function validateSchema(doc: unknown): ValidationResult {
  if (isV2Schema(doc)) {
    const ok = validateV2(doc) as boolean;
    const issues: ValidationIssue[] = ok
      ? []
      : (validateV2.errors ?? []).map((e) => ({
          level: "error" as const,
          path: e.instancePath || "/",
          message: e.message ?? "invalid",
          invariant: null,
        }));
    return finish({ specVersion: "2.0.0", kind: "full", issues });
  }

  const result = validateDocument(doc);
  const declared = (doc as { ramoira?: { spec_version?: unknown } } | null)?.ramoira?.spec_version;
  return finish({
    specVersion: result.kind ? (typeof declared === "string" ? declared : "3.x") : null,
    kind: result.kind,
    issues: result.issues,
  });
}

function finish(r: Omit<ValidationResult, "valid" | "errors">): ValidationResult {
  const errors = r.issues.filter((i) => i.level === "error");
  return {
    ...r,
    valid: errors.length === 0 && r.specVersion !== null,
    errors: errors.map((i) => `${i.path} ${i.message}`),
  };
}

/** The v3 hash and summary helpers, re-exported for the CLI's commands. */
export { computeContentHash, extractSummary } from "@ramoira/schema";
