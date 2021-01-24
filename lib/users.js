var _file = require('./file');
var helpers = require('./helpers');
var crypto = require('crypto');

var handlers = {};
const USERS_FOLDER = 'users';
const TOKEN_FOLDER = 'tokens';

handlers.users = (data, callback) => {
    if (['get', 'post', 'put', 'delete'].includes(data.method)) {
        return _userHandler[data.method](data, callback)
    }
    return callback(405); // Method Not-Allowed
}

var _userHandler = {};
_userHandler.post = (data, callback) => {
    const { firstName, lastName, phone, password } = data.payload;
    if (!firstName || !lastName || !phone || !password) {
        return callback(400, { 'Error': 'all parameters are required!' });
    }
    _file.read(USERS_FOLDER, phone, err => {
        if (!err) {
            return callback(409); //conflict with other user
        }
        const hashedPassword = helpers.hash(password);
        if (!hashedPassword) {
            return callback(500, { 'Error': 'Could not hash the user\'s password!' });
        }
        _file.create(
            USERS_FOLDER,
            phone,
            { firstName, lastName, phone, password: hashedPassword },
            err => {
                if (!err) {
                    callback(201);
                } else {
                    console.log(err);
                    callback(500, { 'Error': 'Could not create the new user' });
                }
            })

    })
}
_userHandler.get = (data, callback) => {
    const { phone } = data.queryStringObject;
    _file.read(USERS_FOLDER, phone, (err, data) => {
        if (err) {
            return callback(404);
        }
        delete data.password;
        callback(200, data)
    })
}

_userHandler.put = (data, callback) => {
    const { firstName, lastName, phone, password } = data.payload;
    if (!phone) {
        return callback(400, { 'Error': 'The phone is required!' });
    }
    _file.read(USERS_FOLDER, phone, (err, data) => {
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
            USERS_FOLDER,
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
_userHandler.delete = (data, callback) => {
    const { phone } = data.queryStringObject;
    if (!phone) {
        return callback(400, { 'Error': 'The phone is required!' });
    }
    _file.read(USERS_FOLDER, phone, err => {
        if (err) {
            return callback(404, { 'Error': 'Could not found the user!' });
        }
        _file.delete(USERS_FOLDER, phone, err => {
            if (!err) {
                return callback(200);
            }
            callback(500, { 'Error': 'Could not delete the specified user!' });
        })
    })
}


handlers.tokens = (data, callback) => {
    if (['get', 'post', 'put', 'delete'].includes(data.method)) {
        return _tokenHandler[data.method](data, callback)
    }
    return callback(405);
}

var _tokenHandler = {};
_tokenHandler.post = (data, callback) => {
    const { phone, password } = data.payload;
    if (!phone || !password) {
        return callback(400, { 'Error': 'Phone and Password are required!' });
    }
    _file.read(USERS_FOLDER, phone, (err, data) => {
        if (err) {
            return callback(404, { 'Error': 'There is no such a user' });
        }
        const hashedPassword = helpers.hash(password);
        if (hashedPassword !== data.password) {
            return callback(400, { 'Error': 'The password did not mach the specific user!' })
        }
        var token = {
            id: crypto.randomBytes(20).toString('hex'),
            expires: Date.now() * 60 * 60 * 1000,
            phone
        };
        _file.create(TOKEN_FOLDER, token.id, token, err => {
            if (err) {
                return callback(500, { 'Error': 'Could not create token file!' });
            }
            callback(201, token);
        })
    })
};
_tokenHandler.get = (data, callback) => {

};
_tokenHandler.put = (data, callback) => {

};
_tokenHandler.delete = (data, callback) => {

}

module.exports = handlers;