import ChatRoomModel, { CHAT_ROOM_TYPES } from "../models/ChatRoom.js";
import { ChatMessageModel } from "../models/ChatMessage.js";
import UserModel from "../models/User.js";
import mongoose from "mongoose";
import user from "../controllers/user.js";

class WebSockets {
    users = [];
    connection(client) {
        let myUserId;

        //Disconnect from sock
        client.on("disconnect", () => {
            this.users = this.users.filter(
                (user) => user.socketId !== client.id
            );
            global.io.emit('updateUserStatus', myUserId, 'offline');
        });

        //User is offline
        client.on("offline", (uid) => {

            this.users = this.users.filter(
                (user) => user.socketId !== client.id
            );
            if (uid) {
                global.io.emit("updateUserStatus", uid, 'offline');
            };
        })

        //User is Online
        client.on("online", (userId) => {
            this.users.push({
                socketId: client.id,
                userId,
            });
            global.io.emit("updateUserStatus", userId, "online");
        });

        //Checks User Online Status
        client.on("checkUserStatus", (uid, cb) => {
            let userStatus = this.users.find((user) => user.userId === uid);
            userStatus = userStatus ? "online" : "offline";
            cb(userStatus);
        });

        //Get all users that are online
        client.on("getOnlineUsers", async (userId, cb) => {
            let ids = this.users
                .filter((user) => user.userId !== userId)
                .map((user) => {
                    return user.userId;
                });

            const onlineUsers = await UserModel.getUsersByIds(ids);
            cb(onlineUsers);

            // client.emit("onlineUsers", onlineUsers);
        });

        //Gets all users
        client.on("getAllUsers", async (cb) => {
            let allUsers = await UserModel.getAllUsers();
            // client.emit("allUsers", allUsers);
            cb(allUsers);
        });

        //Gets all rooms from UserId
        client.on("getRooms", async (uid, cb) => {
            let rooms = await ChatRoomModel.getRoomsByUserId(uid);
            cb(rooms);
        });

        //Requests to add a friend
        client.on("addFriend", async (uid1, uid2, cb) => {
            UserModel.requestFriend(uid1, uid2, () => {
                let userSocket = this.users.filter(user => user.userId === uid2);
                if (userSocket.length > 0) {
                    global.io.to(userSocket[0].socketId).emit('getUserFriends'); 
                }
                cb();
            });
        });

        //Searches for a users public info
        client.on("searchUser", async (username, cb) => {
            let user = await UserModel.getByUsername(username);
            cb(user);
        });

        //Remove a user as a friend
        client.on("removeFriend", async (uid1, uid2, cb) => {
            let uid1ObjectId = mongoose.Types.ObjectId(uid1);
            let uid2ObjectId = mongoose.Types.ObjectId(uid2);
            UserModel.removeFriend(uid1ObjectId, uid2ObjectId, (err) => {
                let userSocket = this.users.filter(user => user.userId === uid2);
                if (userSocket.length > 0) {
                    global.io.to(userSocket[0].socketId).emit('getUserFriends'); 
                }
                cb();
            });
        });

        //Get all friends of a user
        client.on("getFriends", async (uid, cb) => {
            UserModel.getFriends(uid, function (err, friends) {
                cb(friends);
            });
        });

        //Create a chat
        client.on(
            "createChat",
            async (userIds, chatInitiator, roomName, cb) => {
                const chatType = CHAT_ROOM_TYPES.REGULAR;
                const chatRoomInfo = await ChatRoomModel.initiateChat(
                    userIds,
                    chatInitiator,
                    roomName,
                    chatType
                );

                client.join(chatRoomInfo.chatRoomId);
                userIds.map((user) => {
                    if (user !== chatInitiator) {
                        this.subscribeOtherUser(chatRoomInfo.chatRoomId, user);
                    }
                });
                client.emit("chatRoomInfo", chatRoomInfo);
                cb(chatRoomInfo);
            }
        );

        //Deletes a chat
        client.on("deleteChat", async (roomId, userId, cb) => {
            let roomInfo = await ChatRoomModel.getChatRoomByRoomId(roomId);
            
            if (roomInfo.chatInitiator === userId) {
                await ChatRoomModel.deleteChatRoomByRoomId(roomId);
            }
            cb();
        });

        //Create a DirectMessage
        client.on("createDM", async (chatInitiator, otherUser) => {
            const userIds = [chatInitiator.uid, otherUser.uid];
            const chatType = CHAT_ROOM_TYPES.DIRECT_MESSAGE;
            const chatRoomInfo = await ChatRoomModel.initiateDM(
                userIds,
                chatInitiator,
                chatType
            );
            client.join(chatRoomInfo.chatRoomId);
            this.subscribeOtherUser(chatRoomInfo.chatRoomId, otherUser);
        });

        //When a user is typing
        client.on("typingStarted", async (chatRoomId, typerId) => {
            global.io.to(chatRoomId).emit("userTyping", typerId);
        });

        //When a user stops typing
        client.on("typingEnded", async (chatRoomId, typerId) => {
            global.io.to(chatRoomId).emit("userStoppedTyping", typerId);
        });

        //Sends a message in the chatroom
        client.on(
            "sendMessage",
            async (message, chatRoomId, messageSender, attachments, callback) => {
                
                const post = await ChatMessageModel.createPostInChatRoom(
                    chatRoomId,
                    message,
                    messageSender,
                    attachments
                );
                global.io.in(post.chatRoomId).emit("newMessage", post);
                
                // let rooms = Object.keys(client.rooms);
                // client.emit("newMessage", post);

                callback();
            }
        );
        
        //Get all mesages from a chatroom
        client.on("getMessages", async (chatRoomId, callback) => {
            const messages = await ChatMessageModel.getConversationByRoomId(
                chatRoomId
            );
            if (messages) {
                callback(messages);
            }
        });

        //Gets all info of a chatroom
        client.on("getChatRoomInfo", async (chatRoomId, callback) => {
            const chatRoomInfo = await ChatRoomModel.getChatRoomByRoomId(
                chatRoomId
            );
            client.join(chatRoomInfo._id);
            chatRoomInfo.userIds.map((user) => {
                if (user !== chatRoomInfo.chatInitiator) {
                    this.subscribeOtherUser(chatRoomInfo._id, user);
                }
            });
            if (chatRoomInfo) {
                callback(chatRoomInfo);
            }
        });

        client.on("addUsersToRoom", async (roomId, userIds, cb) => {
            let updatedRoomInfo = await ChatRoomModel.addUsersToRoom(roomId, userIds);
            userIds.map((user) => {
                this.subscribeOtherUser(roomId, user);
            });
            const chatRoomInfo = await ChatRoomModel.getChatRoomByRoomId(
                updatedRoomInfo._id
            );
            client.emit("updatedChatRoomInfo", chatRoomInfo);
            cb();
        });


        //Subscribes a user to a chatroom
        client.on("subscribe", (room, otherUserId = "") => {
            this.subscribeOtherUser(room, otherUserId);
            client.join(room);
        });

        //Unsubscribes a user from a room
        client.on("unsubscribe", (room) => {
            client.leave(room);
        });
    }

    subscribeOtherUser(room, otherUserId) {
        const userSockets = this.users.filter(
            (user) => user.userId === otherUserId
        );
        userSockets.map((userInfo) => {
            const socketConnection =
                global.io.sockets.connected[userInfo.socketId];
            if (socketConnection) {
                socketConnection.join(room);
            }
        });
    }
}

export default new WebSockets();