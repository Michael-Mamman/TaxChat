import type { Request, Response } from "express";
import ServiceRequest from "../models/serviceRequest.model.js";

export const createServiceRequest = async (req: Request, res: Response) => {
  try {
    const serviceRequest = await ServiceRequest.create(req.body);
    return res.status(201).json({ success: true, data: serviceRequest });
  } catch (err) {
    console.error("Error creating service request:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getServiceRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const serviceRequest = await ServiceRequest.findById(id);

    if (!serviceRequest) {
      return res.status(404).json({ success: false, message: "Service request not found" });
    }

    return res.json({ success: true, data: serviceRequest });
  } catch (err) {
    console.error("Error fetching service request:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getServiceRequestByReference = async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const serviceRequest = await ServiceRequest.findOne({ reference_number: reference });

    if (!serviceRequest) {
      return res.status(404).json({ success: false, message: "Service request not found" });
    }

    return res.json({ success: true, data: serviceRequest });
  } catch (err) {
    console.error("Error fetching service request:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateServiceRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const serviceRequest = await ServiceRequest.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!serviceRequest) {
      return res.status(404).json({ success: false, message: "Service request not found" });
    }

    return res.json({ success: true, data: serviceRequest });
  } catch (err) {
    console.error("Error updating service request:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const listServiceRequests = async (req: Request, res: Response) => {
  try {
    const { phone, status, type } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (phone) filter.phone = phone;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [requests, total] = await Promise.all([
      ServiceRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ServiceRequest.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Error listing service requests:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const listByTaxpayer = async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const requests = await ServiceRequest.find({ phone })
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error("Error listing service requests:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
