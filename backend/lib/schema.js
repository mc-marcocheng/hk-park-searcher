import { z } from "zod";
import { districtCodes, equipmentTypes, equipmentTypeSet } from "./catalog.js";

const SAFE_ID = /^[a-z0-9][a-z0-9_-]{2,79}$/i;
const SAFE_BASENAME = /^[a-z0-9_-]+$/;
const HONG_KONG_BOUNDS = {
    latMin: 22.13,
    latMax: 22.58,
    lngMin: 113.82,
    lngMax: 114.52,
};

const imageVariantSchema = z
    .object({
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
            .min(4)
            .max(2_900_000)
            .regex(/^[A-Za-z0-9+/]+={0,2}$/, "base64 must be valid"),
    })
    .superRefine((variant, ctx) => {
        if (variant.base64.length % 4 !== 0) {
            ctx.addIssue({
                code: "custom",
                path: ["base64"],
                message: "base64 padding is invalid",
            });
            return;
        }

        const decodedLength = Buffer.from(variant.base64, "base64").length;
        if (decodedLength !== variant.byteLength) {
            ctx.addIssue({
                code: "custom",
                path: ["byteLength"],
                message: "byteLength does not match image data",
            });
        }
    });

const commonImageFields = {
    clientId: z.string().uuid(),
    med: imageVariantSchema,
    thumb: imageVariantSchema,
};

const imageSchema = z.discriminatedUnion("role", [
    z.object({
        ...commonImageFields,
        role: z.literal("park"),
        equipmentType: z.null(),
    }),
    z.object({
        ...commonImageFields,
        role: z.literal("equipment"),
        equipmentType: z.enum(equipmentTypes),
    }),
]);

const parkSchema = z.object({
    name: z.object({
        zh: z.string().trim().min(2).max(100),
        en: z.string().trim().max(120).optional().default(""),
    }),
    districtCode: z.string().refine((value) => districtCodes.has(value), {
        message: "unknown district",
    }),
    address: z.object({
        zh: z.string().trim().min(3).max(200),
        en: z.string().trim().max(240).optional().default(""),
    }),
    coords: z.object({
        lat: z.number().min(HONG_KONG_BOUNDS.latMin).max(HONG_KONG_BOUNDS.latMax),
        lng: z.number().min(HONG_KONG_BOUNDS.lngMin).max(HONG_KONG_BOUNDS.lngMax),
    }),
    equipment: z
        .array(z.string())
        .max(equipmentTypes.length)
        .refine((types) => types.every((type) => equipmentTypeSet.has(type)), {
            message: "unknown equipment type",
        })
        .refine((types) => new Set(types).size === types.length, {
            message: "duplicate equipment type",
        }),
    metrics: z.object({
        quality: z.number().int().min(1).max(5),
    }),
    comment: z.string().max(2000).optional().default(""),
});

const retainedImageSchema = z.discriminatedUnion("role", [
    z.object({
        reference: z.string().min(1).max(2048),
        role: z.literal("park"),
        equipmentType: z.null(),
    }),
    z.object({
        reference: z.string().min(1).max(2048),
        role: z.literal("equipment"),
        equipmentType: z.enum(equipmentTypes),
    }),
]);

const commonSubmissionFields = {
    submissionVersion: z.literal(2),
    submissionKey: z.string().uuid(),
    startedAt: z.number().int().positive(),
    website: z.string().max(0).optional().default(""),
    turnstileToken: z.string().min(1).max(4096),
    park: parkSchema,
    attestations: z.object({
        accurate: z.literal(true),
        imageRights: z.literal(true),
        publicSubmission: z.literal(true),
    }),
};

const createSubmissionSchema = z
    .object({
        ...commonSubmissionFields,
        operation: z.literal("create"),
        images: z.array(imageSchema).min(1).max(8),
    })
    .strict();

const updateSubmissionSchema = z.object({
    ...commonSubmissionFields,
    operation: z.literal("update"),
    parkId: z.string().regex(SAFE_ID),
    baseBlobSha: z.string().regex(/^[a-f0-9]{40}$/i),
    retainedImages: z.array(retainedImageSchema).max(100),
    images: z.array(imageSchema).max(8),
});

export const submissionSchema = z
    .discriminatedUnion("operation", [createSubmissionSchema, updateSubmissionSchema])
    .superRefine((submission, ctx) => {
        validateImagePayload(submission, ctx);

        if (submission.operation === "create") {
            validateCreateImageCoverage(submission, ctx);
        }

        // Update coverage must be checked again after the backend has loaded
        // and authenticated retained canonical references.
    });

function validateImagePayload(submission, ctx) {
    const imageIds = new Set();
    const equipmentWithImages = new Set();
    let hasParkImage = false;
    let totalImageBytes = 0;

    submission.images.forEach((image, index) => {
        if (imageIds.has(image.clientId)) {
            ctx.addIssue({
                code: "custom",
                path: ["images", index, "clientId"],
                message: "duplicate image id",
            });
        }
        imageIds.add(image.clientId);

        totalImageBytes += image.med.byteLength + image.thumb.byteLength;

        if (image.role === "park") {
            hasParkImage = true;
        } else {
            equipmentWithImages.add(image.equipmentType);

            if (!submission.park.equipment.includes(image.equipmentType)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["images", index, "equipmentType"],
                    message: "equipment image type is not listed by the park",
                });
            }
        }
    });

    if (totalImageBytes > 3 * 1024 * 1024) {
        ctx.addIssue({
            code: "custom",
            path: ["images"],
            message: "combined image data is too large",
        });
    }

    return { hasParkImage, equipmentWithImages };
}

function validateCreateImageCoverage(submission, ctx) {
    const { hasParkImage, equipmentWithImages } = validateImagePayload(submission, ctx);

    if (!hasParkImage) {
        ctx.addIssue({
            code: "custom",
            path: ["images"],
            message: "at least one park environment image is required",
        });
    }

    submission.park.equipment.forEach((type, index) => {
        if (!equipmentWithImages.has(type)) {
            ctx.addIssue({
                code: "custom",
                path: ["park", "equipment", index],
                message: "equipment type does not have a corresponding image",
            });
        }
    });
}

export function validateSubmission(body) {
    return submissionSchema.safeParse(body);
}

export { SAFE_ID, SAFE_BASENAME };
