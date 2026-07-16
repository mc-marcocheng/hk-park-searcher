import { z } from "zod";
import { districtCodes, equipmentTypeSet } from "./catalog.js";

const SAFE_ID = /^[a-z0-9][a-z0-9_-]{2,79}$/i;
const SAFE_BASENAME = /^[a-z0-9_-]+$/;
const HONG_KONG_BOUNDS = { latMin: 22.13, latMax: 22.58, lngMin: 113.82, lngMax: 114.52 };

const imageVariantSchema = z.object({
    mime: z.literal("image/webp"),
    width: z.number().int().positive().max(4000),
    height: z.number().int().positive().max(4000),
    byteLength: z
        .number()
        .int()
        .positive()
        .max(2 * 1024 * 1024),
    base64: z
        .string()
        .regex(/^[A-Za-z0-9+/]+=*$/, "base64 must be valid")
        .max(2_900_000),
});

const imageSchema = z.object({
    clientId: z.string().uuid(),
    role: z.enum(["park", "equipment"]),
    equipmentType: z.string().nullable(),
    med: imageVariantSchema,
    thumb: imageVariantSchema,
});

const parkSchema = z.object({
    name: z.object({
        zh: z.string().min(2).max(100),
        en: z.string().max(120).optional().default(""),
    }),
    districtCode: z.string().refine((v) => districtCodes.has(v), "unknown district"),
    address: z.object({
        zh: z.string().min(3).max(200),
        en: z.string().max(240).optional().default(""),
    }),
    coords: z.object({
        lat: z.number().min(HONG_KONG_BOUNDS.latMin).max(HONG_KONG_BOUNDS.latMax),
        lng: z.number().min(HONG_KONG_BOUNDS.lngMin).max(HONG_KONG_BOUNDS.lngMax),
    }),
    equipment: z
        .array(z.string())
        .max(6)
        .refine((arr) => arr.every((t) => equipmentTypeSet.has(t)), "unknown equipment type"),
    comment: z.string().max(2000).optional().default(""),
});

export const submissionSchema = z.object({
    submissionVersion: z.literal(1),
    submissionKey: z.string().uuid(),
    startedAt: z.number().int().positive(),
    website: z.string().max(0).optional().default(""),
    turnstileToken: z.string().min(1),
    park: parkSchema,
    images: z.array(imageSchema).max(8),
    attestations: z.object({
        accurate: z.literal(true),
        imageRights: z.literal(true),
        publicSubmission: z.literal(true),
    }),
});

export function validateSubmission(body) {
    return submissionSchema.safeParse(body);
}

export { SAFE_ID, SAFE_BASENAME };
