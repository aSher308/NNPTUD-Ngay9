var express = require('express');
var router = express.Router();
const { checkLogin } = require("../utils/authHandler");
let messageModel = require('../schemas/messages');
let mongoose = require('mongoose');

// get "/" - lấy message cuối cùng của mỗi user mà user hiện tại nhắn tin hoặc user khác nhắn cho user hiện tại
router.get('/', checkLogin, async function (req, res, next) {
    let currentUserId = new mongoose.Types.ObjectId(req.user._id.toString());
    
    try {
        let messages = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        { from: currentUserId },
                        { to: currentUserId }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: {
                            if: { $eq: ["$from", currentUserId] },
                            then: "$to",
                            else: "$from"
                        }
                    },
                    lastMessage: { $first: "$$ROOT" }
                }
            },
            {
                $replaceRoot: { newRoot: "$lastMessage" }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);
        
        await messageModel.populate(messages, { path: 'from to', select: 'username email avatarUrl fullName' });
        
        res.send(messages);
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
    let currentUserId = req.user._id;
    let { to, type, text } = req.body; 
    
    // Validate request data
    if (!to || !type || !text) {
        return res.status(400).send({ message: "Missing required fields: to, type, text" });
    }
    if (!["file", "text"].includes(type)) {
        return res.status(400).send({ message: "Type must be either 'file' or 'text'" });
    }
    
    try {
        let newMessage = new messageModel({
            from: currentUserId,
            to: to,
            messageContent: {
                type: type,
                text: text
            }
        });
        await newMessage.save();
        
        // Populate before returning
        await newMessage.populate('from to', 'username email avatarUrl fullName');
        
        res.status(201).send(newMessage);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

module.exports = router;
