import sharp from "sharp";

const MAX_MED_BYTES = 400 * 1024;
const MAX_THUMB_BYTES = 80 * 1024;
const MAX_DIMENSION = 2000;

export async function reencodeImage(base64, label) {
    const buffer = Buffer.from(base64, "base64");

    let image;
    try {
        image = sharp(buffer, { limitInputPixels: false });
    } catch {
        throw new Error(`Invalid ${label} image data`);
    }

    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error(`Cannot read ${label} image dimensions`);
    }

    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
        throw new Error(`${label} image too large`);
    }

    const webp = image.webp({ quality: 82 }).resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
    });

    const output = await webp.toBuffer();
    const outMeta = await sharp(output).metadata();

    const maxBytes = label === "med" ? MAX_MED_BYTES : MAX_THUMB_BYTES;
    if (output.length > maxBytes) {
        throw new Error(`${label} image exceeds size limit after re-encoding`);
    }

    return {
        buffer: output,
        width: outMeta.width,
        height: outMeta.height,
        byteLength: output.length,
    };
}
