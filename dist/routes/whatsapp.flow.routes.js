import { Router } from "express";
import { flowSetup } from "../controller/whatsapp.flowResponse.js";
console.log('[whatsapp.flow.routes::module] loading whatsapp flow router');
const router = Router();
router.post("/", (req, res, next) => {
    console.log('[whatsapp.flow.routes::POST /] ENTER', {
        hasBody: Boolean(req.body),
    });
    return flowSetup(req, res);
});
console.log('[whatsapp.flow.routes::module] whatsapp flow router ready');
export default router;
