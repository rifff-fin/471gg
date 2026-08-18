const cloudinary = require("cloudinary").v2;
const { PassThrough } = require("stream");

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
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
    // VIVA: Refuse uploads safely when credentials are unavailable.
    return Promise.reject(
      new Error(
        "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    // VIVA: Stream memory-held uploads directly to Cloudinary; do not write files locally.
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "ekotro",
        resource_type: options.resource_type || "image",
        transformation: options.transformation || [
          { quality: "auto:good" },
        ],
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
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
