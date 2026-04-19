import { Router } from "express";
import { flowSetup } from "../controller/whatsapp.flowResponse.js";
const router = Router();
router.post("/", flowSetup);
export default router;
