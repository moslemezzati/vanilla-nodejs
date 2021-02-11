var _file = require('./file');
var helpers = require('./helpers');
var crypto = require('crypto');
const { USERS_FOLDER, TOKEN_FOLDER, CHECKS_FOLDER } = require('./constants');

var handlers = {};


handlers.index = (data, cb) => {
    if (data.method.toLowerCase() != 'get') {
        return cb(405, undefined, 'html')
    }
    var templateData = {
        'head.title': 'This is the title',
        'head.description': 'This is the meta description',
        'body.title': 'Hello templated world!',
        'body.class': 'index'
    };
    helpers.getTemplate('index', templateData, (err, str) => {
        if (err) {
            console.log(err);
            return cb(500, undefined, 'html');
        }
        helpers.addUniversalHeaders(str, templateData, (err, str) => {
            if (err || !str) {
                return cb(500, undefined, 'html');
            }
            cb(200, str, 'html');
        })
    })
}


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
        return callback(400, { Error: 'all parameters are required!' });
    }
    _file.read(USERS_FOLDER, phone, err => {
        if (!err) {
            return callback(409); //conflict with other user
        }
        const hashedPassword = helpers.hash(password);
        if (!hashedPassword) {
            return callback(500, { Error: 'Could not hash the user\'s password!' });
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
                    callback(500, { Error: 'Could not create the new user' });
                }
            })

    })
}
_userHandler.get = (data, callback) => {
    const { phone } = data.queryStringObject;
    const { token } = data.headers;
    if (!token) {
        return callback(401, { Error: 'Missing required token in header!' });
    }
    verifyToekn(token, phone, isTokenValid => {
        if (!isTokenValid) {
            return callback(401, { Error: 'Token is invalid!' });
        }
        _file.read(USERS_FOLDER, phone, (err, data) => {
            if (err) {
                return callback(404, `Could not find user with ${phone} phone number!`);
            }
            delete data.password;
            callback(200, data)
        })

    })
}

_userHandler.put = (data, callback) => {
    const { firstName, lastName, phone, password } = data.payload;
    if (!phone) {
        return callback(400, { Error: 'The phone is required!' });
    }
    const { token } = data.headers;
    if (!token) {
        return callback(401, { Error: 'Missing required token in header!' });
    }
    verifyToekn(token, phone, isTokenValid => {
        if (!isTokenValid) {
            return callback(401, { Error: 'Token is invalid!' });
        }
        _file.read(USERS_FOLDER, phone, (err, data) => {
            if (err) {
                return callback(404, { Error: 'The specified user does not exist!' });
            }
            if (password) {
                const hashedPassword = helpers.hash(password);
                if (!hashedPassword) {
                    return callback(500, { Error: 'Could not hash the user\'s password!' });
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
                    callback(500, { Error: 'Could not update the new user' });
                })
        })
    })
}
_userHandler.delete = (data, callback) => {
    const { phone } = data.queryStringObject;
    if (!phone) {
        return callback(400, { Error: 'The phone is required!' });
    }
    const { token } = data.headers;
    if (!token) {
        return callback(401, { Error: 'Missing required token in header!' });
    }
    verifyToekn(token, phone, isTokenValid => {
        if (!isTokenValid) {
            return callback(401, { Error: 'Token is invalid!' });
        }
        _file.read(USERS_FOLDER, phone, (err, data) => {
            if (err) {
                return callback(404, { Error: 'Could not find the user!' });
            }
            _file.delete(USERS_FOLDER, phone, err => {
                if (err) {
                    return callback(500, { Error: 'Could not delete the specified user!' });
                }

                const checks = Array.isArray(data.checks) ? data.checks : [];
                const deletionError = false;
                const numberChecks = checks.length;
                if (numberChecks > 0) {
                    let deletionNumber = 0;
                    checks.forEach(checkId => {
                        _file.delete(CHECKS_FOLDER, checkId, err => {
                            if (err) {
                                deletionError = true;
                            }
                            deletionNumber++;
                            if (deletionNumber === numberChecks) {
                                if (deletionError) {
                                    return callback(500, {
                                        Error: `Error encountered while attemping to delete all the user's checks.
                                    all checks may not have been deleted. from the system successfully!`});
                                }
                                return callback(200);
                            }
                        })
                    })
                } else {
                    return callback(200);
                }
            })
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
        return callback(400, { Error: 'Phone and Password are required!' });
    }
    _file.read(USERS_FOLDER, phone, (err, data) => {
        if (err) {
            return callback(404, { Error: 'There is no such a user' });
        }
        const hashedPassword = helpers.hash(password);
        if (hashedPassword !== data.password) {
            return callback(400, { Error: 'The password did not mach the specific user!' })
        }
        var token = {
            id: crypto.randomBytes(10).toString('hex'),
            expires: Date.now() + 60 * 60 * 1000,
            phone
        };
        _file.create(TOKEN_FOLDER, token.id, token, err => {
            if (err) {
                return callback(500, { Error: 'Could not create token file!' });
            }
            callback(201, token);
        })
    })
};

_tokenHandler.get = (data, callback) => {
    const { id } = data.queryStringObject;
    _file.read(TOKEN_FOLDER, id, (err, data) => {
        if (err) {
            return callback(404, { Error: 'There is no token with this id!' });
        }
        callback(200, data)
    });
};

_tokenHandler.put = (data, callback) => {
    let { id, extend } = data.payload;
    if (!id) {
        return callback(400, { Error: 'The id is required!' });
    }

    _file.read(TOKEN_FOLDER, id, (err, data) => {
        if (err) {
            return callback(404, { Error: 'The specified token does not exist!' });
        }
        if (data.expires < Date.now()) {
            return callback(400, { Error: 'The token\' is already expired, and can not be extended!' });
        }
        if (extend) {
            data.expires = Date.now() + 60 * 60 * 1000;
        }
        _file.update(TOKEN_FOLDER, id, data, err => {
            if (!err) {
                return callback(204); //No-Content
            }
            console.log(err);
            callback(500, { Error: 'Could not update the new token' });
        })
    })
};

_tokenHandler.delete = (data, callback) => {
    const { id } = data.queryStringObject;
    if (!id) {
        return callback(400, { Error: 'Id is required!' });
    }

    _file.read(TOKEN_FOLDER, id, err => {
        if (err) {
            return callback(401, { Error: 'Token is invalid!' });
        }
        _file.delete(TOKEN_FOLDER, id, err => {
            if (!err) {
                return callback(200);
            }
            callback(500, { Error: 'Could not delete the specified token!' });
        });
    });
}

const verifyToekn = (id, phone, cb) => {
    _file.read(TOKEN_FOLDER, id, (err, token) => {
        if (err) {
            return cb(false);
        }
        cb(token.phone == phone && token.expires > Date.now());
    })
}

module.exports = { handlers, verifyToekn };