const sharp = require('sharp');
const fs = require('fs');

/**
 * Optimizes an image using sharp.
 * Resizes the image, converts to WebP, and reduces quality to strictly ensure low file size (~50kb limit visually).
 * 
 * @param {string} inputFilePath - Path to the original uploaded file
 * @param {number} maxWidth - Max width of the image (default 500)
 * @returns {Promise<Buffer>} - The optimized image buffer
 */
const optimizeImage = async (inputFilePath, maxWidth = 500) => {
  try {
    // We use WebP with a slightly lower quality (around 70) which is generally indistinguishable 
    // from 100 for small profile/team icons, but results in massive byte savings.
    const buffer = await sharp(inputFilePath)
      .resize({
        width: maxWidth,
        height: maxWidth,
        fit: sharp.fit.cover,
        position: sharp.strategy.entropy,
      })
      .webp({ quality: 75 })
      .toBuffer();

    return buffer;
  } catch (err) {
    console.error('Sharp Optimization failed:', err);
    throw err;
  } finally {
    // Delete the original unoptimized temp file immediately to save disk space
    try {
      if (fs.existsSync(inputFilePath)) {
        fs.unlinkSync(inputFilePath);
      }
    } catch (e) {
      console.warn('Failed to delete temp file in optimizer:', e);
    }
  }
};

module.exports = { optimizeImage };
