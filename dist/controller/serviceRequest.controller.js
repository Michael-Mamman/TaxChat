import ServiceRequest from "../models/serviceRequest.model.js";
export const createServiceRequest = async (req, res) => {
    console.log('[serviceRequest.controller::createServiceRequest] ENTER', {
        bodyKeys: Object.keys(req.body || {}),
    });
    try {
        console.log('[serviceRequest.controller::createServiceRequest] branch: try');
        const serviceRequest = await ServiceRequest.create(req.body);
        console.log('[serviceRequest.controller::createServiceRequest] created', { id: serviceRequest?._id });
        console.log('[serviceRequest.controller::createServiceRequest] EXIT - 201');
        return res.status(201).json({ success: true, data: serviceRequest });
    }
    catch (err) {
        console.log('[serviceRequest.controller::createServiceRequest] branch: catch');
        console.error("Error creating service request:", err);
        console.log('[serviceRequest.controller::createServiceRequest] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const getServiceRequest = async (req, res) => {
    console.log('[serviceRequest.controller::getServiceRequest] ENTER', { id: req.params?.id });
    try {
        console.log('[serviceRequest.controller::getServiceRequest] branch: try');
        const { id } = req.params;
        const serviceRequest = await ServiceRequest.findById(id);
        if (!serviceRequest) {
            console.log('[serviceRequest.controller::getServiceRequest] branch: not found');
            console.log('[serviceRequest.controller::getServiceRequest] EXIT - 404');
            return res.status(404).json({ success: false, message: "Service request not found" });
        }
        console.log('[serviceRequest.controller::getServiceRequest] branch: found');
        console.log('[serviceRequest.controller::getServiceRequest] EXIT - success');
        return res.json({ success: true, data: serviceRequest });
    }
    catch (err) {
        console.log('[serviceRequest.controller::getServiceRequest] branch: catch');
        console.error("Error fetching service request:", err);
        console.log('[serviceRequest.controller::getServiceRequest] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const getServiceRequestByReference = async (req, res) => {
    console.log('[serviceRequest.controller::getServiceRequestByReference] ENTER', {
        reference: req.params?.reference,
    });
    try {
        console.log('[serviceRequest.controller::getServiceRequestByReference] branch: try');
        const { reference } = req.params;
        const serviceRequest = await ServiceRequest.findOne({ reference_number: reference });
        if (!serviceRequest) {
            console.log('[serviceRequest.controller::getServiceRequestByReference] branch: not found');
            console.log('[serviceRequest.controller::getServiceRequestByReference] EXIT - 404');
            return res.status(404).json({ success: false, message: "Service request not found" });
        }
        console.log('[serviceRequest.controller::getServiceRequestByReference] branch: found');
        console.log('[serviceRequest.controller::getServiceRequestByReference] EXIT - success');
        return res.json({ success: true, data: serviceRequest });
    }
    catch (err) {
        console.log('[serviceRequest.controller::getServiceRequestByReference] branch: catch');
        console.error("Error fetching service request:", err);
        console.log('[serviceRequest.controller::getServiceRequestByReference] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const updateServiceRequest = async (req, res) => {
    console.log('[serviceRequest.controller::updateServiceRequest] ENTER', {
        id: req.params?.id,
        updateKeys: Object.keys(req.body || {}),
    });
    try {
        console.log('[serviceRequest.controller::updateServiceRequest] branch: try');
        const { id } = req.params;
        const updates = req.body;
        const serviceRequest = await ServiceRequest.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
        if (!serviceRequest) {
            console.log('[serviceRequest.controller::updateServiceRequest] branch: not found');
            console.log('[serviceRequest.controller::updateServiceRequest] EXIT - 404');
            return res.status(404).json({ success: false, message: "Service request not found" });
        }
        console.log('[serviceRequest.controller::updateServiceRequest] branch: updated');
        console.log('[serviceRequest.controller::updateServiceRequest] EXIT - success');
        return res.json({ success: true, data: serviceRequest });
    }
    catch (err) {
        console.log('[serviceRequest.controller::updateServiceRequest] branch: catch');
        console.error("Error updating service request:", err);
        console.log('[serviceRequest.controller::updateServiceRequest] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const listServiceRequests = async (req, res) => {
    console.log('[serviceRequest.controller::listServiceRequests] ENTER', {
        query: { phone: req.query?.phone, status: req.query?.status, type: req.query?.type },
    });
    try {
        console.log('[serviceRequest.controller::listServiceRequests] branch: try');
        const { phone, status, type } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (phone) {
            console.log('[serviceRequest.controller::listServiceRequests] branch: filter phone');
            filter.phone = phone;
        }
        if (status) {
            console.log('[serviceRequest.controller::listServiceRequests] branch: filter status');
            filter.status = status;
        }
        if (type) {
            console.log('[serviceRequest.controller::listServiceRequests] branch: filter type');
            filter.type = type;
        }
        const [requests, total] = await Promise.all([
            ServiceRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            ServiceRequest.countDocuments(filter),
        ]);
        console.log('[serviceRequest.controller::listServiceRequests] query done', {
            count: requests.length,
            total,
        });
        console.log('[serviceRequest.controller::listServiceRequests] EXIT - success');
        return res.json({
            success: true,
            data: requests,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        console.log('[serviceRequest.controller::listServiceRequests] branch: catch');
        console.error("Error listing service requests:", err);
        console.log('[serviceRequest.controller::listServiceRequests] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const listByTaxpayer = async (req, res) => {
    console.log('[serviceRequest.controller::listByTaxpayer] ENTER', {
        phone: req.params?.phone,
        limit: req.query?.limit,
    });
    try {
        console.log('[serviceRequest.controller::listByTaxpayer] branch: try');
        const { phone } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const requests = await ServiceRequest.find({ phone })
            .sort({ createdAt: -1 })
            .limit(limit);
        console.log('[serviceRequest.controller::listByTaxpayer] query done', { count: requests.length });
        console.log('[serviceRequest.controller::listByTaxpayer] EXIT - success');
        return res.json({ success: true, data: requests });
    }
    catch (err) {
        console.log('[serviceRequest.controller::listByTaxpayer] branch: catch');
        console.error("Error listing service requests:", err);
        console.log('[serviceRequest.controller::listByTaxpayer] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
