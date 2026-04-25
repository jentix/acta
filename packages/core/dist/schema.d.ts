import { z } from "zod";
export declare const documentKindSchema: z.ZodEnum<{
    adr: "adr";
    spec: "spec";
}>;
export declare const documentMetadataSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    date: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    component: z.ZodDefault<z.ZodArray<z.ZodString>>;
    owners: z.ZodDefault<z.ZodArray<z.ZodString>>;
    summary: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | undefined, string | null | undefined>>;
    links: z.ZodDefault<z.ZodPipe<z.ZodObject<{
        related: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        supersedes: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        replacedBy: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        decidedBy: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        dependsOn: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        validates: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        references: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>, z.ZodTransform<{
        related: string[];
        supersedes: string[];
        replacedBy: string[];
        decidedBy: string[];
        dependsOn: string[];
        validates: string[];
        references: string[];
    }, {
        related?: string[] | undefined;
        supersedes?: string[] | undefined;
        replacedBy?: string[] | undefined;
        decidedBy?: string[] | undefined;
        dependsOn?: string[] | undefined;
        validates?: string[] | undefined;
        references?: string[] | undefined;
    }>>>;
    kind: z.ZodLiteral<"adr">;
    status: z.ZodEnum<{
        proposed: "proposed";
        accepted: "accepted";
        rejected: "rejected";
        deprecated: "deprecated";
        superseded: "superseded";
    }>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    date: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    component: z.ZodDefault<z.ZodArray<z.ZodString>>;
    owners: z.ZodDefault<z.ZodArray<z.ZodString>>;
    summary: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | undefined, string | null | undefined>>;
    links: z.ZodDefault<z.ZodPipe<z.ZodObject<{
        related: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        supersedes: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        replacedBy: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        decidedBy: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        dependsOn: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        validates: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
        references: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>, z.ZodTransform<{
        related: string[];
        supersedes: string[];
        replacedBy: string[];
        decidedBy: string[];
        dependsOn: string[];
        validates: string[];
        references: string[];
    }, {
        related?: string[] | undefined;
        supersedes?: string[] | undefined;
        replacedBy?: string[] | undefined;
        decidedBy?: string[] | undefined;
        dependsOn?: string[] | undefined;
        validates?: string[] | undefined;
        references?: string[] | undefined;
    }>>>;
    kind: z.ZodLiteral<"spec">;
    status: z.ZodEnum<{
        draft: "draft";
        active: "active";
        paused: "paused";
        implemented: "implemented";
        obsolete: "obsolete";
    }>;
}, z.core.$strip>], "kind">;
