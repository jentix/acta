import { z } from "zod";
const adrStatusSchema = z.enum([
    "proposed",
    "accepted",
    "rejected",
    "deprecated",
    "superseded"
]);
const specStatusSchema = z.enum([
    "draft",
    "active",
    "paused",
    "implemented",
    "obsolete"
]);
export const documentKindSchema = z.enum(["adr", "spec"]);
const stringArray = z.array(z.string()).default([]);
const linkSetSchema = z
    .object({
    related: stringArray.optional(),
    supersedes: stringArray.optional(),
    replacedBy: stringArray.optional(),
    decidedBy: stringArray.optional(),
    dependsOn: stringArray.optional(),
    validates: stringArray.optional(),
    references: stringArray.optional()
})
    .transform((value) => ({
    related: value.related ?? [],
    supersedes: value.supersedes ?? [],
    replacedBy: value.replacedBy ?? [],
    decidedBy: value.decidedBy ?? [],
    dependsOn: value.dependsOn ?? [],
    validates: value.validates ?? [],
    references: value.references ?? []
}))
    .default({
    related: [],
    supersedes: [],
    replacedBy: [],
    decidedBy: [],
    dependsOn: [],
    validates: [],
    references: []
});
const commonMetadataSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    date: z.preprocess((value) => {
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        return value;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    tags: z.array(z.string()).default([]),
    component: z.array(z.string()).default([]),
    owners: z.array(z.string()).default([]),
    summary: z.string().min(1).nullish().transform((value) => value ?? undefined),
    links: linkSetSchema
});
export const documentMetadataSchema = z.discriminatedUnion("kind", [
    commonMetadataSchema.extend({
        kind: z.literal("adr"),
        status: adrStatusSchema
    }),
    commonMetadataSchema.extend({
        kind: z.literal("spec"),
        status: specStatusSchema
    })
]);
//# sourceMappingURL=schema.js.map