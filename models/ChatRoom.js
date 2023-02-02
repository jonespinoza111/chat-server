import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

export const CHAT_ROOM_TYPES = {
  REGULAR: "regular",
  DIRECT_MESSAGE: "direct-message",
};

const chatRoomSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4().replace(/\-/g, ""),
    },
    userIds: Array,
    chatInitiator: String,
    type: String,
    roomName: String,
    inviteCode: {
      type: String,
      default: () => uuidv4(),
    },
  },
  {
    timestamps: true,
    collection: "chatrooms",
  }
);

chatRoomSchema.statics.initiateChat = async function (
  userIds,
  chatInitiator,
  roomName,
  type = "REGULAR"
) {
  try {
    const availableRoom = await this.findOne({
      roomName,
      userIds: {
        $size: userIds.length,
        $all: [...userIds],
      },
    });

    if (availableRoom) {
      return {
        isNew: false,
        message: "retrieving an old chat room",
        chatRoomId: availableRoom._doc._id,
      };
    }

    const newRoom = await this.create({ userIds, chatInitiator, roomName });
    return {
      isNew: true,
      message: "Creating a new chat room",
      chatRoomId: newRoom._doc._id,
    };
  } catch (err) {
    console.log("Error while starting a new chat", err);
    throw err;
  }
};

// chatRoomSchema.statics.generateInviteCode = async function (roomId) {
//     try {

//     } catch (err) {

//     }
// }

chatRoomSchema.statics.getRoomsByUserId = async function (userId) {
  try {
    let rooms = await this.find({ userIds: userId });

    rooms = await Promise.all(
      rooms.map(async (room) => {
        let roomInfo = await this.getChatRoomByRoomId(room._id);
        return roomInfo;
      })
    );
    // console.log("all rooms", rooms);
    return rooms;
  } catch (err) {
    console.log("This is get room by userid error", err);
    throw err;
  }
};

chatRoomSchema.statics.getChatRoomByRoomId = async function (roomId) {
  try {
    const aggregate = await this.aggregate([
      { $match: { _id: roomId } },
      { $unwind: "$userIds" },
      {
        $project: {
          _id: 1,
          userIds: { $toObjectId: "$userIds" },
          chatInitiator: 1,
          roomName: 1,
          inviteCode: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userIds",
          foreignField: "_id",
          as: "userIds",
        },
      },
      { $unwind: "$userIds" },
      {
        $project: {
          _id: 1,
          chatInitiator: 1,
          roomName: 1,
          inviteCode: 1,
          "userIds._id": 1,
          "userIds.firstName": 1,
          "userIds.lastName": 1,
          "userIds.username": 1,
        },
      },
      {
        $group: {
          _id: "$_id",
          chatInitiator: { $last: "$chatInitiator" },
          roomName: { $last: "$roomName" },
          inviteCode: { $last: "$inviteCode" },
          userIds: { $addToSet: "$userIds" },
        },
      },
    ]);
    return aggregate[0];
  } catch (err) {
    console.log("This is get room by id error", err);
    throw err;
  }
};

chatRoomSchema.statics.deleteChatRoomByRoomId = async function (roomId) {
  try {
    const deletedChatRoom = await this.findByIdAndDelete(roomId);
    console.log("deleted room in chatroommodel, ", deletedChatRoom);
    return deletedChatRoom;
  } catch (err) {
    console.log("This is get room by id error", err);
    throw err;
  }
};

chatRoomSchema.statics.addUsersToRoom = async function (roomId, userIds) {
    console.log('addUsersToRoom roomId', roomId);
    console.log('addUsersToRoom userIds', userIds);
    try {
        const updatedDoc = await this.findOneAndUpdate(
        { _id: roomId },
        { $addToSet: { userIds: { $each: userIds } } },
        { new: true }
        );

        console.log("update doc doc doc ", updatedDoc);
        return updatedDoc;
    } catch (err) {
        console.log("this is the update error", err);
    }
};
export default mongoose.model("ChatRoom", chatRoomSchema);
