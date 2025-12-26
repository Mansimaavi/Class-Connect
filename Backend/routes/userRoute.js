import express from 'express';
import { getUserProfile } from '../Controllers/ProfileController/profileController.js'; 
import { updateEmail ,updatePassword} from '../Controllers/ProfileController/settingController.js';
const router = express.Router();

router.get('/user/:userId', getUserProfile); 
router.put('/:userId/email', updateEmail); 
router.put('/:userId/password', updatePassword); 

export default router;
