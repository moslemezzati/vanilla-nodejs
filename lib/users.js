var _file = require('./file');
var helpers = require('./helpers');

var handlers = {};
const USERS_PATH = 'users';

handlers.users = (data, callback) => {
    if (['get', 'post', 'put', 'delete'].includes(data.method)) {
        return router[data.method](data, callback)
    }
    return callback(405);
}

var router = {};
router.post = (data, callback) => {
    const { firstName, lastName, phone, password } = data.payload;
    if (!firstName || !lastName || !phone || !password) {
        return callback(400, { 'Error': 'all parameters are required!' });
    }
    _file.read(USERS_PATH, phone, err => {
        if (!err) {
            return callback(409); //conflict with other user
        }
        const hashedPassword = helpers.hash(password);
        if (!hashedPassword) {
            return callback(500, { 'Error': 'Could not hash the user\'s password!' });
        }
        _file.create(
            USERS_PATH,
            phone,
            { firstName, lastName, phone, password: hashedPassword },
            err => {
                if (!err) {
                    callback(200);
                } else {
                    console.log(err);
                    callback(500, { 'Error': 'Could not create the new user' });
                }
            })

    })
}
router.get = (data, callback) => {

}
router.put = (data, callback) => { }
router.delete = (data, callback) => { }

module.exports = handlers;