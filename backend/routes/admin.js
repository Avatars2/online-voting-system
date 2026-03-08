import express from "express";
import { protect, authorizeRoles } from "../middleware/auth.js";
import * as adminCtrl from "../controllers/adminController.js";
import { registerHOD, getAllHODs } from "../controllers/hodTeacherController.js";

const router = express.Router();

router.post("/register", adminCtrl.registerAdmin);

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/stats", adminCtrl.getDashboardStats);

// HOD Management
router.post("/register-hod", registerHOD);
router.get("/hods", getAllHODs);

router.get("/students", adminCtrl.listStudents);
router.post("/students", adminCtrl.registerStudent);
router.post("/student-register", adminCtrl.registerStudent);
router.put("/students/:id", adminCtrl.updateStudent);
router.delete("/students/:id", adminCtrl.deleteStudent);

router.get("/departments", adminCtrl.listDepartments);
router.post("/departments", adminCtrl.createDepartment);
router.post("/department", adminCtrl.createDepartment);
router.get("/departments/:id", adminCtrl.getDepartment);

router.get("/classes", adminCtrl.listClasses);
router.post("/classes", adminCtrl.createClass);
router.post("/class", adminCtrl.createClass);
router.get("/classes/:id", adminCtrl.getClass);

router.get("/notices", adminCtrl.listNotices);
router.post("/notices", adminCtrl.createNotice);
router.post("/notice", adminCtrl.createNotice);

router.get("/elections", adminCtrl.listElections);
router.post("/elections", adminCtrl.createElection);
router.post("/elections/:id/candidates", adminCtrl.addCandidate);

router.get("/results/:electionId", adminCtrl.electionResults);

export default router;
