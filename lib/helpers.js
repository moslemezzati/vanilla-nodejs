var crypto = require('crypto');
var config = require('../config');

var helpers = {};

helpers.hash = str => {
    if (str) {
        return crypto.createHmac('sha256', config.secretKey).update(String(str)).digest('hex');
    }
    return false;
}

helpers.parseJsonToObject = str => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return {};
    }
}
module.exports = helpers;