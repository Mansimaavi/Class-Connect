import Notification from "../models/Notification.js"; 

export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(10);
        res.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
