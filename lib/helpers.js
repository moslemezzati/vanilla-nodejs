var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var config = require('../config');
var request = require('http').request;
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

helpers.sendTwilioSMS = (phone, msg, cb) => {
    phone = typeof (phone) == 'string' && phone.trim().length >= 10 ? phone.trim() : false;
    msg = typeof (msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
    if (!phone || !msg) {
        cb('All parameters are required!');
    }
    var payload = JSON.stringify({
        From: config.twilio.fromPhone,
        To: '+1' + phone,
        Body: msg
    });

    const requestConfig = {
        protocol: 'http:',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
        auth: config.twilio.accountSid + ':' + config.twilio.authToken,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    var req = request(requestConfig, res => {
        const statusCode = res.statusCode;
        if (statusCode == 200 || statusCode == 201) {
            cb(false);
        } else {
            cb('Status code returned was ' + statusCode);
        }
    })

    req.on('error', err => {
        console.log('Error: Twilio error is:', err);
        cb(err)
    });
    //sending-off the request
    req.write(payload);
    req.end();
}

helpers.getTemplate = (templateName, data, cb) => {
    data = typeof (data) == 'object' && data ? data : {};
    templateName = typeof (templateName) == 'string' && templateName ? templateName : false;
    if (!templateName) {
        return cb('A valid template name was not specified');
    }
    var tmpDir = path.join(__dirname, '/../templates/');
    fs.readFile(tmpDir + templateName + '.html', 'utf8', (err, str) => {
        if (err || !str || str.length == 0) {
            return cb(templateName + ' template could be found');
        }
        str = helpers.interpolate(str, data);
        cb(false, str);
    })
}

helpers.addUniversalHeaders = (str, data, cb) => {
    str = typeof (str) == 'string' && str ? str : '';
    data = typeof (data) == 'object' && data ? data : {};

    helpers.getTemplate('_header', data, (err, headerString) => {
        if (err || !headerString) {
            return cb('Could not found the heaer template');
        }
        helpers.getTemplate('_footer', data, (err, footerString) => {
            if (err || !footerString) {
                return cb('Could not found footer template');
            }
            return cb(false, headerString + str + footerString);
        })
    })
}

helpers.interpolate = (str, data) => {
    str = typeof (str) == 'string' && str ? str : '';
    data = typeof (data) == 'object' && data ? data : {};

    for (let keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.' + keyName] = config.templateGlobals[keyName];
        }
    }
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            let replace = data[key];
            let find = `{${key}}`;
            str = str.replace(find, replace);
        }
    }
    return str;
}

helpers.getStaticAssets = (fileName, cb) => {
    fileName = typeof (fileName) == 'string' && fileName.length > 0 ? fileName : false;
    if (!fileName) {
        return cb('A valid file name is not specified');
    }
    let publicDir = path.join(__dirname, '/../public/');
    fs.readFile(publicDir + fileName, (err, data) => {
        if (err || !data) {
            return cb('No file could be found');
        }
        cb(false, data);
    })
}

module.exports = helpers;