import mongoose from "mongoose";
import friends from "mongoose-friends";

const userSchema = new mongoose.Schema(
    {
        profilePic: { type: String, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        username: { type: String, required: true },
        email: { type: String, required: true },
        password: { type: String, required: true },
        friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Friends' }]
    },
    {
        timestamps: true,
        collection: "users",
    }
);

userSchema.plugin(friends({ pathName: "friends" }));

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
        const user = await this.findOne({ _id: uid }).select('firstName lastName email profilePic username createdAt');
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
        const users = await this.find().select('profilePic firstName lastName username email friends');
  
        console.log('One two three get all users ', users); 
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
