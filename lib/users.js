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
    const { phone } = data.queryStringObject;
    _file.read(USERS_PATH, phone, (err, data) => {
        if (err) {
            return callback(404);
        }
        delete data.password;
        callback(200, data)
    })
}

router.put = (data, callback) => {
    const { firstName, lastName, phone, password } = data.payload;
    if (!phone) {
        return callback(400, { 'Error': 'The phone is required!' });
    }
    _file.read(USERS_PATH, phone, (err, data) => {
        if (err) {
            return callback(404, { 'Error': 'The specified user does not exist!' });
        }
        if (password) {
            const hashedPassword = helpers.hash(password);
            if (!hashedPassword) {
                return callback(500, { 'Error': 'Could not hash the user\'s password!' });
            }
            data.password = hashedPassword;
        }
        data.firstName = firstName || data.firstName;
        data.lastName = lastName || data.lastName;
        _file.update(
            USERS_PATH,
            phone,
            data,
            err => {
                if (!err) {
                    return callback(204); //No-Content
                }
                console.log(err);
                callback(500, { 'Error': 'Could not update the new user' });
            })

    })
}
router.delete = (data, callback) => {
    const { phone } = data.queryStringObject;
    if (!phone) {
        return callback(400, { 'Error': 'The phone is required!' });
    }
    _file.read(USERS_PATH, phone, err => {
        if (err) {
            return callback(404, { 'Error': 'Could not found the user!' });
        }
        _file.delete(USERS_PATH, phone, err => {
            if (!err) {
                return callback(200);
            }
            callback(500, { 'Error': 'Could not delete the specified user!' });
        })
    })
}

module.exports = handlers;