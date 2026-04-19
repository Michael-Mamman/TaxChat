import { Router } from "express";
import { handleVerify, handleIncomingMessage } from "../controller/whatsapp.controller.js";
import verifySignature from "../middleware/verifySignature.js";

console.log('[whatsapp.routes::module] loading whatsapp router');
const router = Router();

router.get("/", (req, res, next) => {
  console.log('[whatsapp.routes::GET /] ENTER', {
    query: { mode: req.query?.["hub.mode"], hasToken: Boolean(req.query?.["hub.verify_token"]) },
  });
  return handleVerify(req, res);
});
router.post("/", verifySignature, (req, res, next) => {
  console.log('[whatsapp.routes::POST /] ENTER', {
    hasBody: Boolean(req.body),
  });
  return handleIncomingMessage(req, res);
});

console.log('[whatsapp.routes::module] whatsapp router ready');
export default router;
