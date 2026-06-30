import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

// Helper to sign access token (short-lived)
const signAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

// Helper to generate and persist a refresh token (7 days)
const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

// Send standard token and user details response
const createSendToken = async (user, statusCode, res) => {
  const accessToken = signAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    refreshToken,
    data: {
      user,
    },
  });
};

/**
 * @desc    Sign up a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = catchAsync(async (req, res, next) => {
  const { name, email, password, currency } = req.body;

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return next(new AppError('Email address is already in use.', 400));
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 3. Create user in database
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      currency: currency || undefined,
    },
  });

  // 4. Return success response (no token)
  newUser.password = undefined;

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully. Please log in to continue.',
    data: {
      user: newUser,
    },
  });
});

/**
 * @desc    Login existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist in request
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2. Find user in database
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // 3. Check if user exists and password matches
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 4. Send token
  await createSendToken(user, 200, res);
});

/**
 * @desc    Refresh access token (Refresh Token Rotation)
 * @route   POST /api/auth/refresh
 * @access  Public
 */
export const refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Please provide a refresh token', 400));
  }

  // 1. Find token in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  // 2. Validate token existence and expiry
  if (!storedToken || storedToken.expiresAt < new Date()) {
    if (storedToken) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    }
    return next(new AppError('Refresh token is invalid or has expired. Please log in again.', 401));
  }

  // 3. Delete used refresh token (Rotation)
  await prisma.refreshToken.delete({
    where: { id: storedToken.id },
  });

  // 4. Generate new access & refresh tokens
  const newAccessToken = signAccessToken(storedToken.userId);
  const newRefreshToken = await generateRefreshToken(storedToken.userId);

  res.status(200).json({
    status: 'success',
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

/**
 * @desc    Logout user (invalidate refresh token)
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Please provide a refresh token', 400));
  }

  // Find and delete the token if it exists
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (storedToken) {
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully.',
  });
});

/**
 * @desc    Update user profile details (e.g. name, home currency preference)
 * @route   PATCH /api/auth/profile
 * @access  Private
 */
export const updateProfile = catchAsync(async (req, res, next) => {
  const { name, currency } = req.body;
  const userId = req.user.id;

  const updateData = {};
  if (name) updateData.name = name;
  if (currency) updateData.currency = currency;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  updatedUser.password = undefined;

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
