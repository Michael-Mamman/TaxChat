import { Router } from "express";
import { handleVerify, handleIncomingMessage } from "../controller/whatsapp.controller.js";
import verifySignature from "../middleware/verifySignature.js";

const router = Router();

router.get("/", handleVerify);
router.post("/", verifySignature, handleIncomingMessage);

export default router;
