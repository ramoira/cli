import spec from "@ramoira/schema/SPEC.schema.json" with { type: "json" };

// The spec owns the one canonical surface list (row S16); read it, never copy it.
export const OUTPUT_SURFACES: readonly string[] = (
  spec as { $defs: { OutputSurface: { enum: string[] } } }
).$defs.OutputSurface.enum;

export const surfaceLabel = (s: string): string => s.replace(/_/g, " ");
