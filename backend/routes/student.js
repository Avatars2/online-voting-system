
import express from 'express';
import { protect, authorize } from '../middleware/roleAuth.js';
import * as studentCtrl from '../controllers/studentController.js';
import * as adminCtrl from '../controllers/adminController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('student','admin'));

router.get('/me', studentCtrl.me);
router.get('/elections', studentCtrl.listElections);
router.get('/elections/:electionId/candidates', studentCtrl.getElectionCandidates);
router.post('/vote/:electionId/:candidateId', studentCtrl.vote);
router.get('/notices', adminCtrl.listNoticesForStudent);

export default router;


