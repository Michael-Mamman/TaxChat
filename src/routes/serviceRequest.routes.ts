import { Router } from "express";
import {
  createServiceRequest,
  getServiceRequest,
  getServiceRequestByReference,
  updateServiceRequest,
  listServiceRequests,
  listByTaxpayer,
} from "../controller/serviceRequest.controller.js";

console.log('[serviceRequest.routes::module] loading serviceRequest router');
const router = Router();

router.get("/", (req, res, next) => {
  console.log('[serviceRequest.routes::GET /] ENTER');
  return listServiceRequests(req, res);
});
router.post("/", (req, res, next) => {
  console.log('[serviceRequest.routes::POST /] ENTER');
  return createServiceRequest(req, res);
});
router.get("/ref/:reference", (req, res, next) => {
  console.log('[serviceRequest.routes::GET /ref/:reference] ENTER', { reference: req.params?.reference });
  return getServiceRequestByReference(req, res);
});
router.get("/taxpayer/:phone", (req, res, next) => {
  console.log('[serviceRequest.routes::GET /taxpayer/:phone] ENTER', { phone: req.params?.phone });
  return listByTaxpayer(req, res);
});
router.get("/:id", (req, res, next) => {
  console.log('[serviceRequest.routes::GET /:id] ENTER', { id: req.params?.id });
  return getServiceRequest(req, res);
});
router.patch("/:id", (req, res, next) => {
  console.log('[serviceRequest.routes::PATCH /:id] ENTER', { id: req.params?.id });
  return updateServiceRequest(req, res);
});

console.log('[serviceRequest.routes::module] serviceRequest router ready');
export default router;
