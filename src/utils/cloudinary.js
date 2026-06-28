import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

import ApiError from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
    });

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    throw new ApiError(
      500,
      error?.message || "Failed to upload image to Cloudinary"
    );
  }
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;

  try {
    const response = await cloudinary.uploader.destroy(publicId);

    if (response.result !== "ok" && response.result !== "not found") {
      throw new ApiError(500, "Failed to delete image from Cloudinary");
    }
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Failed to delete image from Cloudinary"
    );
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
