const _file = require('./file');
const http = require('http');
const https = require('https');
const helpers = require('./helpers');
const url = require('url');
const { CHECKS_FOLDER } = require('./constants');
const _log = require('./logs');

var workers = {};

workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60);
};

workers.gatherAllChecks = () => {
    _file.list(CHECKS_FOLDER, (err, files) => {
        if (err || !files || files.length < 1) {
            return console.log('Could not find any checks to process');
        }
        files.forEach(file => {
            _file.read(CHECKS_FOLDER, file, (err, originalCheckData) => {
                if (err || !originalCheckData) {
                    return console.log(`Could not reading this file: ${originalCheckData}`);
                }
                workers.validateCheckData(originalCheckData);
            })
        });
    })
};

workers.validateCheckData = (originalCheckData) => {
    let { id,
        userPhone,
        protocol,
        method,
        state,
        url,
        successCodes,
        timeoutSeconds,
        lastChecked,
    } = originalCheckData;

    originalCheckData.id = typeof (id) === 'string' && id.trim().length == 20 ? id.trim() : false;
    originalCheckData.userPhone = typeof (userPhone) === 'string' && userPhone.trim().length >= 10 ? userPhone.trim() : false;
    originalCheckData.protocol = typeof (protocol) == 'string' && ['http', 'https'].includes(protocol) ? protocol.trim() : false;
    originalCheckData.method = typeof (method) == 'string' && ['get', 'post', 'put', 'delete'].includes(method) ? method : false;
    originalCheckData.state = typeof (state) == 'string' && ['up', 'down'].includes(state) ? state : 'down';
    originalCheckData.url = typeof (url) == 'string' && url.trim().length > 0 ? url.trim() : false;
    originalCheckData.successCodes = Array.isArray(successCodes) && successCodes.length > 0 ? successCodes : false;
    originalCheckData.timeoutSeconds = typeof (timeoutSeconds) == 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;
    originalCheckData.lastChecked = typeof (lastChecked) == 'number' && lastChecked > 0 ? lastChecked : false;

    if (!originalCheckData.id ||
        !originalCheckData.userPhone ||
        !originalCheckData.protocol ||
        !originalCheckData.method ||
        !originalCheckData.url ||
        !originalCheckData.successCodes ||
        !originalCheckData.timeoutSeconds) {
        return console.log('Error: One of the checks is not properly formatted!');
    }
    workers.performCheck(originalCheckData);
};

workers.performCheck = (originalCheckData) => {
    let checkOutcome = { error: false, responseCode: false };
    let outcomeSent = false;
    const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
    const requestConfig = {
        protocol: originalCheckData.protocol + ':',
        hostname: parsedUrl.hostname,
        method: originalCheckData.method.toLowerCase(),
        path: originalCheckData.path,
        timeout: originalCheckData.timeoutSeconds * 1000
    };
    const moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    const req = moduleToUse.request(requestConfig, res => {
        checkOutcome.responseCode = res.statusCode;
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    req.on('error', err => {
        checkOutcome.error = { error: true, value: err };
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    req.on('timeout', () => {
        checkOutcome.error = { error: true, value: 'timeout' };
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    req.end();
};

workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    const state = !checkOutcome.error &&
        checkOutcome.responseCode &&
        originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';

    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state != state ? true : false;

    const timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    originalCheckData.state = state;
    originalCheckData.lastChecked = timeOfCheck;

    _file.update(CHECKS_FOLDER, originalCheckData.id, originalCheckData, err => {
        if (err) {
            return console.log('Error: Tring to update file with id:', originalCheckData.id);
        }
        if (alertWarranted) {
            return workers.alertUserToStatusChange(originalCheckData);
        }
        console.log('Check outcome has not changed, no alert needed.');
    })
};

workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
    const logData = {
        check: originalCheckData,
        outcome: checkOutcome,
        state,
        alert: alertWarranted,
        time: timeOfCheck
    }
    _log.append(originalCheckData.id, JSON.stringify(logData), err => {
        if (err) {
            return console.log('Logging to file failed');
        }
        console.log('Logging to file succeeded');
    })
}

workers.alertUserToStatusChange = (checkData) => {
    let msg = `Alert: Your check for 
        ${checkData.method.toUpperCase()} 
        ${checkData.protocol}://${checkData.url} is currently ${checkData.state}`;
    helpers.sendTwilioSMS(checkData.userPhone, msg, err => {
        if (err) {
            return console.log('Error: Could not send sms alert to user who had a state change in their check.', err);
        }
        console.log('Success: User was alerted to a status change in thire check via sms:', msg)
    });
};

workers.logRotationLoop = () => {
    setInterval(() => {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};

workers.rotateLogs = () => {
    _log.read(false, (err, logs) => {
        if (err || !Array.isArray(logs) || logs.length < 1) {
            return console.log('Could not find any logs to rotate');
        }
        logs.forEach(log => {
            const logId = log.replace('.log', '');
            const newFileId = logId + '-' + Date.now();
            _log.compress(logId, newFileId, err => {
                if (err) {
                    return console.log('Error compressing ', logId, 'file');
                }
                _log.truncate(logId, err => {
                    if (err) {
                        return console.log('Error truncating log file');
                    }
                    console.log('Success truncation log file');
                })
            })
        })
    })
};

workers.init = () => {
    workers.gatherAllChecks();
    workers.loop();
    workers.rotateLogs();
    workers.logRotationLoop();
};

module.exports = workers;