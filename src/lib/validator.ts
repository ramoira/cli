import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import spec from "../schemas/SPEC.schema.json";

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(spec);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSchema(schema: unknown): ValidationResult {
  const valid = validate(schema) as boolean;
  if (valid) return { valid: true, errors: [] };
  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || "(root)"} ${e.message ?? "invalid"}`,
  );
  return { valid: false, errors };
}
