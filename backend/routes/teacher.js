import express from 'express';
import { protect, authorize, classAccess } from '../middleware/roleAuth.js';
import {
  getTeacherDashboard,
  registerStudent,
  getStudents
} from '../controllers/hodTeacherController.js';
import * as adminCtrl from '../controllers/adminController.js';
import { verifyToken, updateMe, changePassword } from '../controllers/authController.js';

const router = express.Router();

// All routes require Teacher role
router.use(protect);
router.use(authorize('teacher'));

// Teacher Dashboard
router.get('/dashboard', getTeacherDashboard);

// Test endpoint to verify authentication
router.get('/test', (req, res) => {
  res.json({
    message: 'Teacher authentication working',
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      assignedClass: req.user.assignedClass
    }
  });
});

// Profile Management
router.get('/profile', verifyToken);
router.put('/profile', updateMe);
router.put('/change-password', changePassword);

// Student Management (Teacher can register students for their class)
router.post('/register-student', classAccess, registerStudent);
router.get('/students', getStudents);

// Notice Management (Teacher can create notices for their class)
router.get('/notices', adminCtrl.listNotices);
router.post('/notices', adminCtrl.createNotice);

// Election Management (Teacher can create elections for their class)
router.get('/elections', adminCtrl.listElections);
router.post('/elections', adminCtrl.createElection);
router.post('/elections/:id/candidates', classAccess, adminCtrl.addCandidate);

// Results Management (Teacher can view results for their class's elections)
router.get('/results/:electionId', adminCtrl.electionResults);

export default router;
