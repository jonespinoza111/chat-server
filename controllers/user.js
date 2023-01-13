import UserModel from "../models/User.js";
import jwt from "jsonwebtoken";
import mongoose from 'mongoose';


const getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.getAllUsers();
        return res.status(200).json({ success: true, users });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err,
        });
    }
};

const getById = async (req, res) => {
    try {
        const user = await UserModel.getById(req.params.uid);
        return res.status(200).json({ success: true, user });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err,
        });
    }
};

const updateById = async (req, res) => {
    const filter = { _id: mongoose.Types.ObjectId(req.params.uid) };
    const update = req.body.userUpdates;

    try {
        const updatedDoc = await UserModel.findOneAndUpdate(filter, update, { new: true })
        ;

        let responseDoc = {
            uid: req.params.uid,
            username: updatedDoc.username,
            profilePic: updatedDoc.profilePic,
            firstName: updatedDoc.firstName,
            lastName: updatedDoc.lastName,
            email: updatedDoc.email            
        }
        
        const authToken = jwt.sign(responseDoc, process.env.JWT_SECRET_KEY);

        return res.status(200).json({ success: true, authToken });

    } catch (err) {
        console.log('this is the update error', err);
        return res.status(500).json({
            success: false,
            error: err
        });
    }
}

const createUser = async (req, res) => {
    console.log('This is the req body', req.body);
    try {
        const { profilePic, firstName, lastName, username, email, password } = req.body.userData;
        const user = await UserModel.createUser(
            profilePic,
            firstName,
            lastName,
            username,
            email,
            password
        );
        return res.status(200).json({ success: true, user });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err,
        });
    }
};

const deleteById = async (req, res) => {
    try {
        const deletedUser = await UserModel.deleteById(req.params.uid);
        return res.status(200).json({
            success: true,
            message: `Deleted a total of ${deletedUser.deletedCount} user(s)`,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err,
        });
    }
};

export default { getAllUsers, getById, updateById, createUser, deleteById };
