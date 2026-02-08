import { v2 as cloudinary } from 'cloudinary';

// IMPORTANT (ESM + dotenv):
// dotenv is loaded at runtime in src/index.js, but ESM imports are evaluated
// before that runtime code runs. If we configured Cloudinary at import time,
// it could run before process.env is populated, leading to missing api_key/
// cloud_name errors.
//
// Solution: configure Cloudinary lazily on first upload.

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

let _configured = false;

export function getCloudinary() {
  if (!_configured) {
    if (!isCloudinaryConfigured()) {
      // Do not configure; caller should throw a helpful error.
      return cloudinary;
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    _configured = true;
  }
  return cloudinary;
}

export default cloudinary;
