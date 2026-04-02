var express = require('express');
var router = express.Router();
const { checkLogin } = require("../utils/authHandler");
let messageModel = require('../schemas/messages');
let mongoose = require('mongoose');

// get "/" - lấy message cuối cùng của mỗi user mà user hiện tại nhắn tin hoặc user khác nhắn cho user hiện tại
router.get('/', checkLogin, async function (req, res, next) {
    let currentUserId = req.user._id.toString();

    try {
        let allMessages = await messageModel.find({
            $or: [{ from: currentUserId }, { to: currentUserId }]
        })
            .sort({ createdAt: -1 })
            .populate('from to', 'username email avatarUrl fullName');

        let latestMessages = [];
        let seenUsers = new Set();

        for (let msg of allMessages) {
            let otherUserId = msg.from._id.toString() === currentUserId
                ? msg.to._id.toString()
                : msg.from._id.toString();

            if (!seenUsers.has(otherUserId)) {
                latestMessages.push(msg);
                seenUsers.add(otherUserId);
            }
        }

        res.send(latestMessages);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// get "/userID" - lấy toàn bộ message from: user hiện tại, to: userID và from: userID và to: user hiện tại
router.get('/:userID', checkLogin, async function (req, res, next) {
    let currentUserId = req.user._id;
    let userID = req.params.userID;

    if (!mongoose.Types.ObjectId.isValid(userID)) {
        return res.status(400).send({ message: "Invalid User ID" });
    }

    try {
        let messages = await messageModel.find({
            $or: [
                { from: currentUserId, to: userID },
                { from: userID, to: currentUserId }
            ]
        }).sort({ createdAt: 1 }).populate('from to', 'username email avatarUrl fullName');

        res.send(messages);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// post "/" - post nội dung tin nhắn
router.post('/', checkLogin, async function (req, res, next) {
    let { to, text } = req.body;

    if (!to || !text) {
        return res.status(400).send({ message: "Missing required fields: to, text" });
    }

    let type = text.startsWith("http") ? "file" : "text"; // Tự động xác định type dựa trên nội dung

    try {
        let newMessage = new messageModel({
            from: req.user._id,
            to: to,
            messageContent: { type, text }
        });
        await newMessage.save();
        await newMessage.populate('from to', 'username email avatarUrl fullName');

        res.status(201).send(newMessage);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

module.exports = router;
