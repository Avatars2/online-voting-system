import express from 'express';
import { protect, authorize, classAccess } from '../middleware/roleAuth.js';
import {
  getTeacherDashboard
} from '../controllers/hodTeacherController.js';

const router = express.Router();

// All routes require Teacher role
router.use(protect);
router.use(authorize('teacher'));

// Teacher Dashboard
router.get('/dashboard', getTeacherDashboard);

export default router;
