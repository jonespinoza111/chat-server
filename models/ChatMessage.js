import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

export const MESSAGE_TYPES = {
    TYPE_TEXT: "text",
};

export const ATTACHMENT_TYPES = {
    TYPE_IMAGE: "image",
    TYPE_AUDIO: "audio",
    TYPE_VIDEO: "video",
    TYPE_GIF: 'gif'
}


const chatMessageSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: () => uuidv4().replace(/\-/g, ""),
        },
        chatRoomId: String,
        message: mongoose.Schema.Types.Mixed,
        type: {
            type: String,
            default: () => MESSAGE_TYPES.TYPE_TEXT,
        },
        postedByUser: String,
        attachments: {
            imagePaths: [String]
        }
    },
    {
        timestamps: true,
    }
);

chatMessageSchema.statics.createPostInChatRoom = async function (
    chatRoomId,
    message,
    postedByUser,
    attachments
) {
    try {
        const post = await this.create({
            chatRoomId,
            message,
            postedByUser,
            attachments
            // readByRecipients: { readByUserId: postedByUser }
        });


        postedByUser = mongoose.Types.ObjectId(postedByUser);

        const aggregate = await this.aggregate([
            { $match: { _id: post._id } },
            {
                $lookup: {
                    from: "users",
                    let: { postedByUser },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", ["$$postedByUser"]],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                username: 1,
                            },
                        },
                    ],
                    as: "postedByUser",
                },
            },
            { $unwind: "$postedByUser" },
            {
                $lookup: {
                    from: 'chatrooms',
                    localField: 'chatRoomId',
                    foreignField: '_id',
                    as: 'chatRoomInfo'
                }
            },
            { $unwind: '$chatRoomInfo' },
            // { $unwind: '$chatRoomInfo.userIds' },
            // { "$addFields": { "userObjectId": { "$toObjectId": "$chatRoomInfo.userIds" }}},
            // {
            //     $lookup: {
            //         from: 'users',
            //         localField: 'userObjectId',
            //         foreignField: '_id',
            //         as: 'chatRoomInfo.userProfile'
            //     }
            // },
            // { $unwind: '$chatRoomInfo.userProfile' },
            {
                $group: { 
                    _id: '$_id',
                    chatRoomId: { $last: '$chatRoomInfo._id' },
                    message: { $last: '$message' },
                    type: { $last: '$type' },
                    postedByUser: { $last: '$postedByUser' },
                    attachments: { $last: '$attachments' },
                    readByRecipients: { $last: '$readByRecipients' },
                    // chatRoomInfo: { $addToSet: '$chatRoomInfo.userProfile' },
                    createdAt: { $last: '$createdAt' },
                    updatedAt: { $last: '$updatedAt' }
                }
            }
        ]);
        return aggregate[0];
    } catch (err) {
        throw err;
    }
};

chatMessageSchema.statics.getConversationByRoomId = async function (
    chatRoomId,
    // options = {}
) {
    try {
        return this.aggregate([
            { $match: { chatRoomId } },
            { $sort: { createdAt: 1 } },
            { "$addFields": { "postedUserId": { "$toObjectId": "$postedByUser" }}},
            {
                $lookup: {
                    from: "users",
                    let: { postedByUser: "$postedUserId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $in: ["$_id", ["$$postedByUser"]] },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                username: 1,
                            },
                        },
                    ],
                    as: "postedByUser",
                },
            },
            { $unwind: "$postedByUser" },
            // { $skip: options.page * options.limit },
            // { $limit: options.limit },
            { $sort: { createdAt: 1 } },
        ]);
    } catch (err) {
        throw err;
    }
};


export const ChatMessageModel = mongoose.model(
    "ChatMessage",
    chatMessageSchema
);
