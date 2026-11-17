# @presencis/bom-schemas

Apache-2.0 schemas for three public Presencis bills of materials.

- **AI-BOM** (`presencis-ai-bom-v1`): model provenance, base architecture, domain-specialization lineage, quantization and precision, evaluation evidence state, attestation digest and signature metadata, and alignment tags for EU AI Act Article 11, ISO 42001, and NIST AI RMF.
- **CBOM** (`presencis-cbom-v1`): cryptographic components (symmetric, asymmetric, KEM, signature, hash), parameter sets such as ML-DSA-65, ML-KEM-768, Ed25519, SHA-256, and AES-256-GCM, quantum-safety (`classical`, `hybrid`, `pqc`), key-rotation posture, and DORA, NIS2, and CRA tags.
- **VSBOM** (`presencis-vsbom-v1`): verified software bill of materials and quad posture manifest. Posture kinds are `fixed_vsbom`, `living_vsbom`, `fixed_aibom`, and `living_aibom`. Evidence state is `judged`, `cannot-tell`, or `untested`.

Each document is checked twice: JSON Schema Draft 2020-12 (Ajv) and a Zod schema of the same shape. `validateAiBom`, `validateCbom`, and `validateVsbom` return `{ ok: true, value }` only when both accept the document. A rejection is `{ ok: false, errors: { ajv, zod } }`.

```bash
npm install
npm run build
npm test
```

`dist/` is build output and is gitignored. `npm run build` emits it.

The schemas describe document shape. They do not verify a signature.

## Related Documentation

- [Aegis Regulatory Readiness & Quad-BOM](https://presencis.com/solutions/aegis/) · [VSBOM Overview](https://presencis.com/vsbom/)
- [Vigil Shadow AI & Estate Visibility](https://presencis.com/solutions/vigil/)
- [Regulatory Frameworks Corpus](https://presencis.com/regulations/) · [Compliance Q&A](https://presencis.com/questions/)
- [Offline Signature & Evidence Verifier (`@presencis/halo-verify`)](https://github.com/Presencis-com/halo-verify)

