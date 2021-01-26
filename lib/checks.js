const crypto = require('crypto');

const { config } = require('process');
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
    const { protocol, url, method, successCode, timeoutSeconds } = data.payload;
    const { token } = data.headers;
    if (!token) {
        return callback(400, { 'Error': 'Missing required token in header!' });
    }
    if (!['http', 'https'].includes(protocol)) {
        return callback(400, { 'Error': 'the protocol is not valid!' });
    }
    if (!url || typeof (url) != 'string') {
        return callback(400, { 'Error': 'the url is not valid!' });
    }
    if (!['put', 'delete', 'post', 'get'].includes(String(method).toLocaleLowerCase())) {
        return callback(400, { 'Error': 'the method is not valid!' });
    }
    if (!Array.isArray(successCode) && successCode.length < 1) {
        return callback(400, { 'Error': 'the successCode is not valid!' });
    }
    if (typeof (timeoutSeconds) != 'number' || timeoutSeconds % 1 !== 0) {
        return callback(400, { 'Error': 'the timeoutSeconds is not valid!' });
    }
    _file.read(TOKEN_FOLDER, token, (err, tokenData) => {
        if (err) {
            return callback(401, { Error: 'the token in invalid!' });
        }
        _file.read(USERS_FOLDER, tokenData.phone, (err, userData) => {
            if (err) {
                return callback(403, { Error: 'Non-authorized' })
            }
            const userChecks = userData.checks && Array.isArray(userData.checks) ? userData.userChecks : [];
            if (userChecks.length > config.maxChecks) {
                return callback(400, { Error: `The user already has the maximum number of checks (${config.maxChecks})` });
            }
            const checkObject = {
                id: crypto.randomBytes(10).toString('hex'),
                method,
                protocol,
                url,
                successCode,
                timeoutSeconds,
                userPhone: userData.phone
            }
            _file.create(CHECKS_FOLDER, checkObject.userPhone, checkObject, err => {
                if (err) {
                    return callback(400, { Error: `Error in creating the new check!` });
                }
                userData.checks = userChecks;
                userData.checks.push(checkObject);
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

module.exports = handlers;