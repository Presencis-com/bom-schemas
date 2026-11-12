import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import { z, type ZodIssue, type ZodType } from "zod";

const schemaDir = join(dirname(fileURLToPath(import.meta.url)), "../schemas");

function readSchema(name: string): object {
  return JSON.parse(readFileSync(join(schemaDir, name), "utf8")) as object;
}

export const aiBomJsonSchema = readSchema("ai-bom.schema.json");
export const cbomJsonSchema = readSchema("cbom.schema.json");
export const vsbomJsonSchema = readSchema("vsbom.schema.json");

const evidenceState = z.enum(["judged", "cannot-tell", "untested"]);
const shortText = z.string().min(1).max(256);
const hex64 = z.string().regex(/^[0-9a-f]{64}$/);

const evidenceObject = z
  .object({
    state: evidenceState,
    evidence_id: shortText.optional(),
    scope: z.string().min(1).max(2048).optional(),
    observed_at: z.string().min(1).max(64).optional(),
    method: shortText.optional(),
    limitations: z.string().min(1).max(4096).optional(),
  })
  .strict();

export const aiBomSchema = z
  .object({
    schema: z.literal("presencis-ai-bom-v1"),
    model: z
      .object({
        name: shortText,
        provenance: z
          .object({
            origin: z.string().min(1).max(2048),
            supplier: shortText,
            retrieved_at: z.string().min(1).max(64),
          })
          .strict(),
        base_architecture: z.string().min(1).max(128),
        domain_specialization: z
          .object({
            domain: z.string().min(1).max(128),
            lineage: z.array(z.string().min(1).max(128)).min(1).max(32),
          })
          .strict(),
        precision: z
          .object({
            quantization: z.string().min(1).max(64),
            profile: z.string().min(1).max(128),
          })
          .strict(),
        evaluation: evidenceObject,
        attestation: z
          .object({
            digest_alg: z.literal("sha-256"),
            digest_hex: hex64,
            signature_alg: z.enum(["ml-dsa-65", "ed25519", "hybrid-ed25519-mldsa65"]),
            signature_hex: z.string().regex(/^[0-9a-f]{64,6618}$/),
            key_id: hex64,
          })
          .strict(),
      })
      .strict(),
    alignment: z.array(z.enum(["eu-ai-act-art-11", "iso-42001", "nist-ai-rmf"])).min(1).max(16),
  })
  .strict();

export const cbomSchema = z
  .object({
    schema: z.literal("presencis-cbom-v1"),
    components: z
      .array(
        z
          .object({
            name: shortText,
            primitive: z.enum(["symmetric", "asymmetric", "kem", "signature", "hash"]),
            parameter_set: z.enum([
              "ML-DSA-44",
              "ML-DSA-65",
              "ML-DSA-87",
              "ML-KEM-512",
              "ML-KEM-768",
              "ML-KEM-1024",
              "Ed25519",
              "X25519",
              "SHA-256",
              "SHA-384",
              "SHA-512",
              "AES-128-GCM",
              "AES-256-GCM",
              "ChaCha20-Poly1305",
            ]),
            quantum_safety: z.enum(["classical", "hybrid", "pqc"]),
            key_rotation: z
              .object({
                posture: z.enum(["scheduled", "on-event", "manual", "none"]),
                interval_days: z.number().int().min(0).max(36500),
              })
              .strict(),
          })
          .strict(),
      )
      .min(1)
      .max(256),
    alignment: z.array(z.enum(["dora", "nis2", "cra"])).min(1).max(16),
  })
  .strict();

export const vsbomSchema = z
  .object({
    schema: z.literal("presencis-vsbom-v1"),
    subject: shortText,
    postures: z
      .array(
        z
          .object({
            kind: z.enum(["fixed_vsbom", "living_vsbom", "fixed_aibom", "living_aibom"]),
            evidence: evidenceObject,
            generations: z.number().int().min(0).max(1_000_000).optional(),
            component_count: z.number().int().min(0).max(1_000_000).optional(),
            valid: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(32),
  })
  .strict();

export type AiBom = z.infer<typeof aiBomSchema>;
export type Cbom = z.infer<typeof cbomSchema>;
export type Vsbom = z.infer<typeof vsbomSchema>;

export interface SchemaErrors {
  ajv: ErrorObject[];
  zod: ZodIssue[];
}

export type ValidateResult<T> = { ok: true; value: T } | { ok: false; errors: SchemaErrors };

type AjvConstructor = new (options?: { allErrors?: boolean; strict?: boolean }) => {
  compile: (schema: object) => ValidateFunction;
};
const ajv = new (Ajv2020 as unknown as AjvConstructor)({ allErrors: true, strict: true });
const validateAiBomJson = ajv.compile(aiBomJsonSchema);
const validateCbomJson = ajv.compile(cbomJsonSchema);
const validateVsbomJson = ajv.compile(vsbomJsonSchema);

function both<T>(jsonValidate: ValidateFunction, zodSchema: ZodType<T>, input: unknown): ValidateResult<T> {
  const jsonOk = jsonValidate(input);
  const parsed = zodSchema.safeParse(input);
  if (jsonOk && parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    errors: {
      ajv: jsonValidate.errors ? [...jsonValidate.errors] : [],
      zod: parsed.success ? [] : parsed.error.issues,
    },
  };
}

export function validateAiBom(input: unknown): ValidateResult<AiBom> {
  return both(validateAiBomJson, aiBomSchema, input);
}

export function validateCbom(input: unknown): ValidateResult<Cbom> {
  return both(validateCbomJson, cbomSchema, input);
}

export function validateVsbom(input: unknown): ValidateResult<Vsbom> {
  return both(validateVsbomJson, vsbomSchema, input);
}
