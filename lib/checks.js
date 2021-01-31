const crypto = require('crypto');

const config = require('../config');
const { verifyToekn } = require('./users');
const { USERS_FOLDER, CHECKS_FOLDER, TOKEN_FOLDER } = require('./constants');
const _file = require('./file');

var handlers = {};

handlers.checks = (data, callback) => {
    if (['get', 'post', 'put', 'delete'].includes(data.method)) {
        return handlers[data.method](data, callback)
    }
    return callback(405);
}

handlers.post = (data, callback) => {
    let { protocol, url, method, successCodes, timeoutSeconds } = data.payload;
    const { token } = data.headers;
    if (!token) {
        return callback(400, { Error: 'Missing required token in header!' });
    }
    protocol = String(protocol).toLocaleLowerCase();
    if (!['http', 'https'].includes(protocol)) {
        return callback(400, { Error: 'the protocol is not valid!' });
    }
    if (!url || typeof (url) != 'string') {
        return callback(400, { Error: 'the url is not valid!' });
    }
    method = String(method).toLocaleLowerCase();
    if (!['put', 'delete', 'post', 'get'].includes(method)) {
        return callback(400, { Error: 'the method is not valid!' });
    }
    if (!Array.isArray(successCodes) && successCodes.length < 1) {
        return callback(400, { Error: 'the successCodes is not valid!' });
    }
    if (typeof (timeoutSeconds) != 'number' || timeoutSeconds % 1 !== 0) {
        return callback(400, { Error: 'the timeoutSeconds is not valid!' });
    }
    _file.read(TOKEN_FOLDER, token, (err, tokenData) => {
        if (err) {
            return callback(401, { Error: 'the token in invalid!' });
        }
        if (tokenData.expires < Date.now()) {
            return callback(401, { Error: 'Token is expired!' })
        }
        _file.read(USERS_FOLDER, tokenData.phone, (err, userData) => {
            if (err) {
                return callback(403, { Error: 'Non-authorized' })
            }
            const userChecks = userData.checks && Array.isArray(userData.checks) ? userData.checks : [];
            if (userChecks.length >= config.maxChecks) {
                return callback(400, { Error: `The user already has the maximum number of checks (${config.maxChecks})` });
            }
            const checkObject = {
                id: crypto.randomBytes(10).toString('hex'),
                method,
                protocol,
                url,
                successCodes,
                timeoutSeconds,
                userPhone: userData.phone
            }
            _file.create(CHECKS_FOLDER, checkObject.id, checkObject, err => {
                if (err) {
                    return callback(400, { Error: `Error in creating the new check!` });
                }
                userData.checks = userChecks;
                userData.checks.push(checkObject.id);
                _file.update(USERS_FOLDER, userData.phone, userData, err => {
                    if (err) {
                        return callback(500, { Error: 'Could not update the user with the new check' });
                    }
                    callback(200, checkObject);
                })
            })
        })
    });
}

handlers.get = (data, callback) => {
    const { token } = data.headers;
    if (!token) {
        return callback(401, { Error: 'Missing required token in header!' });
    }
    const { id } = data.queryStringObject;
    if (!id) {
        return callback(400, { Error: 'Missing required Id in param!' });
    }

    _file.read(CHECKS_FOLDER, id, (err, checkData) => {
        if (err || !checkData) {
            return callback(404, { Error: 'Id not found!' });
        }
        verifyToekn(token, checkData.userPhone, isTokenVerifed => {
            if (!isTokenVerifed) {
                return callback(401, { Error: 'The token is invalid!' })
            }
            return callback(200, checkData);
        })
    })
}

handlers.put = (data, callback) => {
    let { protocol, url, method, successCodes, timeoutSeconds } = data.payload;
    const { id } = data.queryStringObject;
    const { token } = data.headers;
    if (!token) {
        return callback(400, { Error: 'Missing required token in header!' });
    }
    if (!id) {
        return callback(400, { Error: 'Missing required id in params!' });
    }
    _file.read(CHECKS_FOLDER, id, (err, data) => {
        if (err) {
            return callback(404, { Error: 'The specified check does not exist!' });
        }
        protocol = String(protocol).toLocaleLowerCase();
        if (['http', 'https'].includes(protocol)) {
            data.protocol = protocol
        }
        if (url || typeof (url) == 'string') {
            data.url = url
        }
        method = String(method).toLocaleLowerCase();
        if (['put', 'delete', 'post', 'get'].includes(method)) {
            data.method = method;
        }
        if (Array.isArray(successCodes) && successCodes.length > 0) {
            data.successCodes = successCodes;
        }
        if (typeof (timeoutSeconds) == 'number' || timeoutSeconds % 1 === 0) {
            data.timeoutSeconds = timeoutSeconds
        }
        verifyToekn(token, data.userPhone, isTokenVerifed => {
            if (!isTokenVerifed) {
                return callback(401, { Error: 'The token is invalid!' });
            }
            _file.update(CHECKS_FOLDER, id, data, err => {
                if (!err) {
                    return callback(204); //No-Content
                }
                callback(500, { Error: 'Could not update the new check!' });
            })
        })
    })
};

handlers.delete = (data, callback) => {
    const { id } = data.queryStringObject;
    if (!id) {
        return callback(400, { Error: 'Id is required!' });
    }
    const { token } = data.headers;
    if (!token) {
        return callback(400, { Error: 'Missing required token in header!' });
    }
    _file.read(CHECKS_FOLDER, id, (err, data) => {
        if (err) {
            return callback(401, { Error: 'Token is invalid!' });
        }
        verifyToekn(token, data.userPhone, isTokenVerifed => {
            if (!isTokenVerifed) {
                return callback(401, { Error: 'Token is invalid!' });
            }
            _file.delete(CHECKS_FOLDER, id, err => {
                if (err) {
                    return callback(500, { Error: 'Could not delete the specified token!' });
                }
                _file.read(USERS_FOLDER, data.userPhone, (err, userData) => {
                    if (err || !userData) {
                        return callback(404, { Error: 'Could not find the user file' });
                    }
                    const checks = Array.isArray(userData.checks) ? userData.checks : [];
                    const position = checks.indexOf(id);
                    if (position == -1) {
                        return callback(500, { Error: 'Could not find the check on user object!' });
                    }
                    checks.splice(position, 1);
                    userData.checks = checks
                    _file.update(USERS_FOLDER, data.userPhone, userData, err => {
                        if (err) {
                            return callback(500, { Error: 'Could not update user data' });
                        }

                        return callback(200);
                    });
                })
            });
        })
    });
}

module.exports = handlers;