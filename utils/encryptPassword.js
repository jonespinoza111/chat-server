import bcrypt from 'bcrypt';
const saltRounds = 10;

export const encryptPassword = async (password) => {
    try {
      const salt = await bcrypt.genSalt(saltRounds);
      const hash = await bcrypt.hash(password, salt);
      return hash;
    } catch (err) {
      throw new Error('Error encrypting password: ' + err);
    }
};


