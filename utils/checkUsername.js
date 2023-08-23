import UserModel from '../models/User.js';

export const checkUsername = async (username) => {
    try {
      const query = { username };
      const user = await UserModel.findOne(query);
      return user ? true : false;
    } catch (err) {
        throw new Error('Error checking username: ' + err);
    }
};