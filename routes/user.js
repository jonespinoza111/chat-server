import express from 'express';
import user from '../controllers/user.js';

const router = express.Router();

router
    .get('/', user.getAllUsers)
    .post('/', user.createUser)
    .get('/:uid', user.getById)
    .put('/:uid', user.updateById)
    .delete('/:uid', user.deleteById)
    .get('/username/:username', user.getByUsername)

export default router;