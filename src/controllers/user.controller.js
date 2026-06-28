import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // Get old, new and confirm password from request body
  // Validate all fields
  // Check if new password and confirm password match
  // Ensure new password is different from old password
  // Fetch the authenticated user
  // Verify the old password
  // Update the password
  // Invalidate the current refresh token for security
  // Save the user (pre-save hook hashes the password)
  // Clear authentication cookies
  // Return success response
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (
    ![oldPassword, newPassword, confirmPassword].every((field) => field?.trim())
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New password and confirm password must be same");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different from old password");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;

  // Invalidate all existing refresh tokens.
  // The user will need to log in again on every device.
  user.refreshToken = undefined;

  await user.save();

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. Please log in again."
      )
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // Get account details from request body
  // Ensure at least one field is provided
  // Check email availability if email is being updated
  // Build an object containing only the provided fields
  // Update the authenticated user's account details
  // Return the updated user
  const { fullName, email, bio } = req.body;

  if (!(fullName || email || bio)) {
    throw new ApiError(400, "At least one field is required");
  }

  if (email) {
    const existingUser = await User.findOne({
      email,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      throw new ApiError(409, "Email is already in use");
    }
  }

  const updateFields = {};

  if (fullName) updateFields.fullName = fullName.trim();
  if (email) updateFields.email = email.trim().toLowerCase();
  if (bio !== undefined) updateFields.bio = bio.trim();

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: updateFields,
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // Get avatar file path from the request
  // Validate avatar file
  // Fetch the authenticated user
  // Upload the new avatar to Cloudinary
  // Store the previous avatar publicId
  // Update the user's avatar details
  // Save the user
  // Try deleting the previous avatar from Cloudinary
  // Fetch the updated user without sensitive fields
  // Return success response
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);

  if (!uploadedAvatar?.secure_url || !uploadedAvatar?.public_id) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  const oldAvatarPublicId = user.avatar?.publicId;

  user.avatar = {
    url: uploadedAvatar.secure_url,
    publicId: uploadedAvatar.public_id,
  };

  await user.save({ validateBeforeSave: false });

  try {
    if (oldAvatarPublicId) {
      await deleteFromCloudinary(oldAvatarPublicId);
    }
  } catch (error) {
    console.error(
      "Failed to delete old avatar from Cloudinary:",
      error.message
    );
  }

  const updatedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // Check if cover image file exists
  // Fetch the authenticated user
  // Upload the new cover image to Cloudinary
  // Store the previous cover image publicId
  // Update the user's cover image details
  // Save the user
  // Try deleting the previous cover image from Cloudinary
  // Fetch the updated user without sensitive fields
  // Return success response

  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!uploadedCoverImage?.secure_url || !uploadedCoverImage?.public_id) {
    throw new ApiError(500, "Failed to upload cover image");
  }

  const oldCoverImagePublicId = user.coverImage?.publicId;

  user.coverImage = {
    url: uploadedCoverImage.secure_url,
    publicId: uploadedCoverImage.public_id,
  };

  await user.save({ validateBeforeSave: false });

  try {
    if (oldCoverImagePublicId) {
      await deleteFromCloudinary(oldCoverImagePublicId);
    }
  } catch (error) {
    console.error(
      "Failed to delete old cover image from Cloudinary:",
      error.message
    );
  }

  const updatedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Cover image updated successfully")
    );
});
