import Taxpayer from "../models/taxpayer.model.js";
export const getTaxpayer = async (req, res) => {
    console.log('[taxpayer.controller::getTaxpayer] ENTER', { phone: req.params?.phone });
    try {
        console.log('[taxpayer.controller::getTaxpayer] branch: try');
        const { phone } = req.params;
        const taxpayer = await Taxpayer.findOne({ phone });
        if (!taxpayer) {
            console.log('[taxpayer.controller::getTaxpayer] branch: not found');
            console.log('[taxpayer.controller::getTaxpayer] EXIT - 404');
            return res.status(404).json({ success: false, message: "Taxpayer not found" });
        }
        console.log('[taxpayer.controller::getTaxpayer] branch: found');
        console.log('[taxpayer.controller::getTaxpayer] EXIT - success');
        return res.json({ success: true, data: taxpayer });
    }
    catch (err) {
        console.log('[taxpayer.controller::getTaxpayer] branch: catch');
        console.error("Error fetching taxpayer:", err);
        console.log('[taxpayer.controller::getTaxpayer] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const updateTaxpayer = async (req, res) => {
    console.log('[taxpayer.controller::updateTaxpayer] ENTER', {
        phone: req.params?.phone,
        updateKeys: Object.keys(req.body || {}),
    });
    try {
        console.log('[taxpayer.controller::updateTaxpayer] branch: try');
        const { phone } = req.params;
        const updates = req.body;
        const taxpayer = await Taxpayer.findOneAndUpdate({ phone }, { $set: updates }, { new: true, runValidators: true });
        if (!taxpayer) {
            console.log('[taxpayer.controller::updateTaxpayer] branch: not found');
            console.log('[taxpayer.controller::updateTaxpayer] EXIT - 404');
            return res.status(404).json({ success: false, message: "Taxpayer not found" });
        }
        console.log('[taxpayer.controller::updateTaxpayer] branch: updated');
        console.log('[taxpayer.controller::updateTaxpayer] EXIT - success');
        return res.json({ success: true, data: taxpayer });
    }
    catch (err) {
        console.log('[taxpayer.controller::updateTaxpayer] branch: catch');
        console.error("Error updating taxpayer:", err);
        console.log('[taxpayer.controller::updateTaxpayer] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const listTaxpayers = async (req, res) => {
    console.log('[taxpayer.controller::listTaxpayers] ENTER', {
        page: req.query?.page,
        limit: req.query?.limit,
    });
    try {
        console.log('[taxpayer.controller::listTaxpayers] branch: try');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [taxpayers, total] = await Promise.all([
            Taxpayer.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Taxpayer.countDocuments(),
        ]);
        console.log('[taxpayer.controller::listTaxpayers] query done', {
            count: taxpayers.length,
            total,
        });
        console.log('[taxpayer.controller::listTaxpayers] EXIT - success');
        return res.json({
            success: true,
            data: taxpayers,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        console.log('[taxpayer.controller::listTaxpayers] branch: catch');
        console.error("Error listing taxpayers:", err);
        console.log('[taxpayer.controller::listTaxpayers] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
