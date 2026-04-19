import { Router } from "express";
import { getTaxpayer, updateTaxpayer, listTaxpayers } from "../controller/taxpayer.controller.js";

const router = Router();

router.get("/", listTaxpayers);
router.get("/:phone", getTaxpayer);
router.patch("/:phone", updateTaxpayer);

export default router;
