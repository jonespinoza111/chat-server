import ChatRoomModel, { CHAT_ROOM_TYPES } from "../models/ChatRoom.js";
import { ChatMessageModel } from "../models/ChatMessage.js";
import UserModel from "../models/User.js";
import mongoose from "mongoose";

class WebSockets {
    users = [];
    connection(client) {
        let myUserId;

        //Disconnect from sock
        client.on("disconnect", () => {
            console.log('yeahhhhhh disconnect', myUserId);
            this.users = this.users.filter(
                (user) => user.socketId !== client.id
            );
            global.io.emit('updateUserStatus', myUserId, 'offline');
        });

        //User is offline
        client.on("offline", (uid) => {
            console.log('yeahhhhhh offline', uid);

            this.users = this.users.filter(
                (user) => user.socketId !== client.id
            );
            if (uid) {
                global.io.emit("updateUserStatus", uid, 'offline');
            };
        })

        //User is Online
        client.on("online", (userId) => {
            myUserId = userId;
            console.log("online userId toy story", userId);
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
            console.log("this is this users status here,", userStatus);
            cb(userStatus);
        });

        //Get all users that are online
        client.on("getOnlineUsers", async (userId, cb) => {
            console.log("this.users", this.users);
            let ids = this.users
                .filter((user) => user.userId !== userId)
                .map((user) => {
                    return user.userId;
                });

            console.log("cool ids", ids);

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
            console.log("adding friend", cb);
            UserModel.requestFriend(uid1, uid2, () => {
                cb();
            });
        });

        //Searches for a users public info
        client.on("searchUser", async (username, cb) => {
            let user = await UserModel.getByUsername(username);
            console.log('user scrappy doo', user);
            cb(user);
        });

        //Remove a user as a friend
        client.on("removeFriend", async (uid1, uid2, cb) => {
            console.log("removing friend", cb);
            uid1 = mongoose.Types.ObjectId(uid1);
            uid2 = mongoose.Types.ObjectId(uid2);
            UserModel.removeFriend(uid1, uid2, (err) => {
                console.log("removing friend err", err);
                cb();
            });
        });

        //Get all friends of a user
        client.on("getFriends", async (uid, cb) => {
            UserModel.getFriends(uid, function (err, friends) {
                console.log("getting friends right now");
                cb(friends);
            });
        });

        //Create a chat
        client.on(
            "createChat",
            async (userIds, chatInitiator, roomName, cb) => {
                console.log("now creating a new chat");
                const chatType = CHAT_ROOM_TYPES.REGULAR;
                const chatRoomInfo = await ChatRoomModel.initiateChat(
                    userIds,
                    chatInitiator,
                    roomName,
                    chatType
                );

                console.log("chatroominfo after I create chat", chatRoomInfo);

                client.join(chatRoomInfo.chatRoomId);
                userIds.map((user) => {
                    if (user !== chatInitiator) {
                        this.subscribeOtherUser(chatRoomInfo.chatRoomId, user);
                    }
                });
                client.emit("chatRoomInfo", chatRoomInfo);
                // cb(chatRoomInfo);
            }
        );

        //Deletes a chat
        client.on("deleteChat", async (chatRoomId, cb) => {
            const deletedRoom = await ChatRoomModel.deleteChatRoomByRoomId(
                chatRoomId
            );
            console.log("here is your deleted room in websocket", deletedRoom);
            cb();
        });

        //Create a DirectMessage
        client.on("createDM", async (chatInitiator, otherUser) => {
            console.log("now creating a new DM");
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

        // client.on("getRoomInfo", async (chatRoomId) => {
        //     const chatRoomInfo = await ChatRoomModel.getChatRoomByRoomId(
        //         chatRoomId
        //     );
        //     client.join(chatRoomId);
        //     if (chatRoomInfo) {
        //         client.emit("chatRoomInfo", chatRoomInfo);
        //     } else {
        //         console.log("could not find chatroominfo");
        //     }
        // });

        //Sends a message in the chatroom
        client.on(
            "sendMessage",
            async (message, chatRoomId, messageSender, attachments, callback) => {
                console.log(
                    "all info in sendmessage funct",
                    message,
                    chatRoomId,
                    messageSender,
                    callback
                );
                if (attachments) {
                    console.log('these are the attachments ', attachments);
                }
                const post = await ChatMessageModel.createPostInChatRoom(
                    chatRoomId,
                    message,
                    messageSender,
                    attachments
                );
                console.log("post on the back end ", post);
                console.log("rooms in sned message", client.rooms);
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
                console.log("Look at this chatinfo", chatRoomInfo);
                callback(chatRoomInfo);
            }
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