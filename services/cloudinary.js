const cloudinary = require("cloudinary").v2;
const { PassThrough } = require("stream");

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadBuffer = (buffer, options = {}) => {
  if (!buffer || !buffer.length) {
    return Promise.reject(new Error("No upload buffer provided."));
  }

  if (!isConfigured) {
    const mimeType = options.mimeType || "image/jpeg";
    return Promise.resolve({
      public_id: options.publicId || `local-${Date.now()}`,
      secure_url: `data:${mimeType};base64,${buffer.toString("base64")}`,
      bytes: buffer.length,
      resource_type: "image",
    });
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "ekotro",
        resource_type: options.resource_type || "image",
        transformation: options.transformation,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    const readable = new PassThrough();
    readable.end(buffer);
    readable.pipe(stream);
  });
};

module.exports = {
  uploadBuffer,
  isConfigured,
};