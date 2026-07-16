import sharp from "sharp";

const VARIANTS = {
    med: {
        width: 800,
        height: 1200,
        maxBytes: 400 * 1024,
        quality: 82,
    },
    thumb: {
        width: 200,
        height: 300,
        maxBytes: 80 * 1024,
        quality: 76,
    },
};

export async function reencodeImage(base64, label) {
    const options = VARIANTS[label];
    if (!options) throw new Error(`Unknown image variant: ${label}`);

    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length) throw new Error(`Invalid ${label} image data`);

    try {
        const source = sharp(buffer, {
            failOn: "error",
            limitInputPixels: 40_000_000,
        });

        const metadata = await source.metadata();

        if (!metadata.width || !metadata.height) {
            throw new Error(`Cannot read ${label} image dimensions`);
        }

        if (metadata.width > 4000 || metadata.height > 4000) {
            throw new Error(`${label} image dimensions are too large`);
        }

        for (let quality = options.quality; quality >= 50; quality -= 6) {
            const output = await sharp(buffer, {
                failOn: "error",
                limitInputPixels: 40_000_000,
            })
                .rotate()
                .resize({
                    width: options.width,
                    height: options.height,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .webp({ quality })
                .toBuffer();

            if (output.length <= options.maxBytes) {
                const outputMetadata = await sharp(output).metadata();

                return {
                    buffer: output,
                    width: outputMetadata.width,
                    height: outputMetadata.height,
                    byteLength: output.length,
                };
            }
        }

        throw new Error(`${label} image exceeds size limit after re-encoding`);
    } catch (error) {
        if (
            error.message?.includes("exceeds size limit") ||
            error.message?.includes("dimensions are too large")
        ) {
            throw error;
        }

        throw new Error(`Invalid ${label} image data`);
    }
}
