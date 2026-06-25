const cloudinary = require('cloudinary').v2;


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extracts the public_id from a Cloudinary URL.
 * @param {string} url - The Cloudinary image URL.
 * @returns {string|null} - The public_id or null if not found.
 */
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;

  try {

    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;


    let startIndex = uploadIndex + 1;
    if (
      parts[startIndex].startsWith('v') &&
      !isNaN(parts[startIndex].substring(1))
    ) {
      startIndex++;
    }


    const pathWithExt = parts.slice(startIndex).join('/');

    const lastDotIndex = pathWithExt.lastIndexOf('.');
    return lastDotIndex !== -1
      ? pathWithExt.substring(0, lastDotIndex)
      : pathWithExt;
  } catch (error) {
    console.error('Failed to extract public_id from URL:', error);
    return null;
  }
};

/**
 * Deletes an asset from Cloudinary using its URL.
 * @param {string} url - The Cloudinary image URL.
 * @returns {Promise<any>} - Cloudinary deletion result.
 */
const deleteCloudinaryAsset = async (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) return null;

  try {
    console.log(`Deleting Cloudinary asset: ${publicId}`);
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary deletion failed:', error);
    throw error;
  }
};

/**
 * Uploads a profile photo to Cloudinary with a unique ID.
 * @param {string} filePath - Path to the local temp file.
 * @param {string} uid - User UID.
 * @returns {Promise<any>} - Cloudinary upload result.
 */
const uploadProfilePhoto = async (filePath, uid) => {
  try {

    const publicId = `profile_${uid}_${Date.now()}`;

    return await cloudinary.uploader.upload(filePath, {
      folder: 'zync-profiles',
      public_id: publicId,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      ],
    });
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  extractPublicId,
  deleteCloudinaryAsset,
  uploadProfilePhoto,
};
