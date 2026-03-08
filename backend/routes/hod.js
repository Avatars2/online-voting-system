import express from 'express';
import { protect, authorize, departmentAccess } from '../middleware/roleAuth.js';
import { 
  registerTeacher, 
  getHODDashboard, 
  getAllTeachers 
} from '../controllers/hodTeacherController.js';
import * as adminCtrl from '../controllers/adminController.js';
import { verifyToken, updateMe, changePassword } from '../controllers/authController.js';

const router = express.Router();

// All routes require HOD role
router.use(protect);
router.use(authorize('hod'));

// HOD Dashboard
router.get('/dashboard', getHODDashboard);

// Profile Management
router.get('/profile', verifyToken);
router.put('/profile', updateMe);
router.put('/change-password', changePassword);

// Student Registration (HOD can register students for their department)
router.post('/register-student', departmentAccess, adminCtrl.registerStudent);

// Class Management (HOD can create classes in their department)
router.post('/classes', departmentAccess, adminCtrl.createClass);
router.get('/classes', departmentAccess, adminCtrl.listClasses);

// Teacher management (HOD can register teachers for their department)
router.post('/register-teacher', departmentAccess, registerTeacher);
router.get('/teachers', getAllTeachers);

// Notice Management (HOD can create notices for their department)
router.post('/notices', departmentAccess, adminCtrl.createNotice);
router.get('/notices', departmentAccess, adminCtrl.listNotices);

// Election Management (HOD can create elections for their department/classes)
router.post('/elections', departmentAccess, adminCtrl.createElection);
router.get('/elections', departmentAccess, adminCtrl.listElections);
router.post('/elections/:id/candidates', departmentAccess, adminCtrl.addCandidate);

// Results (HOD can view results for their department elections)
router.get('/results/:electionId', departmentAccess, adminCtrl.electionResults);

export default router;
