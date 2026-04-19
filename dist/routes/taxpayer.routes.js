import { Router } from "express";
import { getTaxpayer, updateTaxpayer, listTaxpayers } from "../controller/taxpayer.controller.js";
console.log('[taxpayer.routes::module] loading taxpayer router');
const router = Router();
router.get("/", (req, res, next) => {
    console.log('[taxpayer.routes::GET /] ENTER');
    return listTaxpayers(req, res);
});
router.get("/:phone", (req, res, next) => {
    console.log('[taxpayer.routes::GET /:phone] ENTER', { phone: req.params?.phone });
    return getTaxpayer(req, res);
});
router.patch("/:phone", (req, res, next) => {
    console.log('[taxpayer.routes::PATCH /:phone] ENTER', { phone: req.params?.phone });
    return updateTaxpayer(req, res);
});
console.log('[taxpayer.routes::module] taxpayer router ready');
export default router;
