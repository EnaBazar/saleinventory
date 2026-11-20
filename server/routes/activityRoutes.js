
import express from "express";
import ActivityLog from "../models/ActivityLog.js";

const router = express.Router();

// GET /api/activities
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const { module, action, search, startDate, endDate } = req.query;

    const filter = {};

    if (module) {
      filter.module = module;
    }

    if (action) {
      filter.action = action;
    }

    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(safeSearch, "i");

      filter.$or = [
        { adminName: searchRegex },
        { adminUsername: searchRegex },
        { description: searchRegex },
        { targetName: searchRegex },
        { action: searchRegex },
        { module: searchRegex },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        if (!Number.isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }

      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        activities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Activity Log Error:", error);

    res.status(500).json({
      success: false,
      message: "Activity Log load করা যায়নি",
    });
  }
});

export default router;
