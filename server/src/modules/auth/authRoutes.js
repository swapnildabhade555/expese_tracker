import express from 'express';
import { signup, login, refresh, logout, updateProfile } from './authController.js';
import { validate } from '../../middlewares/validate.js';
import { signupSchema, loginSchema, refreshTokenSchema, updateProfileSchema } from './authValidation.js';
import { protect } from '../../middlewares/auth.js';

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/logout', validate(refreshTokenSchema), logout);
router.patch('/profile', protect, validate(updateProfileSchema), updateProfile);

export default router;
