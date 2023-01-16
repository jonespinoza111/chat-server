import mongoose from "mongoose";

const friendsSchema = new mongoose.Schema(
    {
        sender: { type: String, ref: 'Users' },
        recipients: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
        status: {
            type: Number,
            enums: [
                0, //'add friends'
                1, //'requested'
                2, //'pending'
                3, //'friends'
            ],
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Friends", friendsSchema);