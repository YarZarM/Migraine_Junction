import express from "express";
import { registerFCMToken } from "../controllers/usercontroller.js";

const router = express.Router();

router.post("/register-token", registerFCMToken);

export default router;
