import express from 'express';
import { signup, login } from './authController.js';
import { validate } from '../../middlewares/validate.js';
import { signupSchema, loginSchema } from './authValidation.js';

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);

export default router;
