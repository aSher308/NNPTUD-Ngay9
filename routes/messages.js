const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messages");
const { checkLogin } = require("../utils/authHandler");
const { uploadImage } = require("../utils/uploadHandler");

// GET /api/v1/messages/:userID - Get conversation history
router.get("/:userID", checkLogin, async function (req, res, next) {
    try {
        const messages = await messageController.GetMessagesBetweenUsers(req.user._id, req.params.userID);
        res.send(messages);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// POST /api/v1/messages/ - Send a message
router.post("/", checkLogin, uploadImage.single("file"), async function (req, res, next) {
    try {
        let { to, text } = req.body;
        let type = "text";

        if (req.file) {
            type = "file";
            text = req.file.path;
        }

        if (!to || !text) {
            return res.status(400).send({ message: "Recipient and content are required" });
        }

        const newMessage = await messageController.CreateMessage(req.user._id, to, type, text);
        res.send(newMessage);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// GET /api/v1/messages/ - Get last message of each conversation
router.get("/", checkLogin, async function (req, res, next) {
    try {
        const messages = await messageController.GetLastMessagesForUser(req.user._id);
        res.send(messages);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

module.exports = router;
