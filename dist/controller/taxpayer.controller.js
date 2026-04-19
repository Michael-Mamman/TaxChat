import Taxpayer from "../models/taxpayer.model.js";
export const getTaxpayer = async (req, res) => {
    try {
        const { phone } = req.params;
        const taxpayer = await Taxpayer.findOne({ phone });
        if (!taxpayer) {
            return res.status(404).json({ success: false, message: "Taxpayer not found" });
        }
        return res.json({ success: true, data: taxpayer });
    }
    catch (err) {
        console.error("Error fetching taxpayer:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const updateTaxpayer = async (req, res) => {
    try {
        const { phone } = req.params;
        const updates = req.body;
        const taxpayer = await Taxpayer.findOneAndUpdate({ phone }, { $set: updates }, { new: true, runValidators: true });
        if (!taxpayer) {
            return res.status(404).json({ success: false, message: "Taxpayer not found" });
        }
        return res.json({ success: true, data: taxpayer });
    }
    catch (err) {
        console.error("Error updating taxpayer:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const listTaxpayers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [taxpayers, total] = await Promise.all([
            Taxpayer.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Taxpayer.countDocuments(),
        ]);
        return res.json({
            success: true,
            data: taxpayers,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        console.error("Error listing taxpayers:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
