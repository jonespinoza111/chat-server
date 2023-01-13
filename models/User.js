import mongoose from "mongoose";
import friends from "mongoose-friends";
// import { v4 as uuidv4 } from "uuid";

const userSchema = new mongoose.Schema(
    {
        // _id: {
        //     type: String,
        //     default: () => uuidv4().replace(/\-/g, ""),
        // },
        profilePic: { type: String, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        username: { type: String, required: true },
        email: { type: String, required: true },
        password: { type: String, required: true },
        invites: { type: Array, default: () => [] },
    },
    {
        timestamps: true,
        collection: "users",
    }
);

userSchema.plugin(friends());

userSchema.statics.createUser = async function (profilePic, firstName, lastName, username, email, password) {
    try {
        const user = await this.create({ profilePic, firstName, lastName, username, email, password });
        return user;
    } catch (err) {
        throw err;
    }
};

userSchema.statics.getById = async function (uid) {
    try {
        const user = await this.findOne({ _id: uid });
        if (!user) {
            throw { error: "No user with this id was found." };
        }
        return user;
    } catch (err) {
        throw err;
    }
};

userSchema.statics.getByUsername = async function (username) {
    try { 
        let user = await this.findOne({ username });
        if (!user)  {
            user = 'no user found';
        }
        return user;
    } catch (err) {
        throw err;
    }
}

userSchema.statics.getAllUsers = async function () {
    try {
        const users = await this.find();
        return users;
    } catch (err) {
        throw err;
    }
};

userSchema.statics.deleteById = async function (uid) {
    try {
        const result = await this.remove({ _id: uid });
        return result;
    } catch (err) {
        throw err;
    }
};

userSchema.statics.getUsersByIds = async function (uids) {
    try {
        const users = await this.find({ _id: { $in: uids } });
        return users;
    } catch (err) {
        throw err;
    }
} 

export default mongoose.model("User", userSchema);
