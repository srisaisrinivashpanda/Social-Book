import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

import jwt from "jsonwebtoken";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

const generateAccessAndRefreshTokens = async (userId) => {
  //Find user from db
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  //Generate access and refresh token
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  //Save refreshToken

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  //return accessToken and refreshToken
  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  // Get user details from req body
  const { fullName, email, username, password, confirmPassword } = req.body;
  // Validate input
  if (
    [fullName, email, username, password, confirmPassword].some(
      (field) => !field?.trim()
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "password and confirm password must be same");
  }
  // Check if username or email already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // Create the user
  const user = await User.create({
    fullName,
    email,
    username,
    password,
  });

  // Check if user is created
  if (!user) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // Generate access and refresh Token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Fetch user without password and refreshToken
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Failed to fetch created user");
  }

  // return res

  res
    .status(201)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        201,
        {
          user: createdUser,
          accessToken,
          refreshToken,
        },
        "Registered successfully"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  // Get email/username from req body
  // Validate the input
  // Fetch the user
  // Check if the user exists
  // Verify the password
  // Generate new access and refresh token
  // Fetch the user without password and refreshToken
  // Set cookies
  // Return res

  const { input, password } = req.body;

  if (![input, password].every((field) => field?.trim())) {
    throw new ApiError(400, "Username/email and password are required");
  }

  const user = await User.findOne({
    $or: [{ username: input }, { email: input }],
  });

  if (!user) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!loggedInUser) {
    throw new ApiError(500, "Failed to fetch the user");
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "Logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // Get the authenticated user
  // Remove the refreshToken from the database
  // Clear the cookies of access and refresh tokens
  // Return a success response

  await User.findByIdAndUpdate(req.user._id, {
    $unset: {
      refreshToken: 1,
    },
  });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Unauthorized refresh token");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
        },
        "Access token refreshed"
      )
    );
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
