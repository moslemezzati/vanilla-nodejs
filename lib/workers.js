const path = require('path');
const fs = require('fs');
const _file = require('./file');
const http = require('http');
const https = require('https');
const helpers = require('./helpers');
const url = require('url');
const { CHECKS_FOLDER } = require('./constants');
const { worker } = require('cluster');
const { time } = require('console');

var workers = {};

workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 + 60);
}

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
}

workers.validateCheckData = (originalCheckData) => {
    let { id,
        userPhone,
        protocol,
        method,
        state,
        url,
        successCode,
        timeoutSeconds,
        lastChecked,
    } = originalCheckData;

    id = typeof (id) === 'string' && id.trim().length == 20 ? id.trim() : false;
    userPhone = typeof (userPhone) === 'string' && userPhone.trim().length == 10 ? userPhone.trim() : false;
    protocol = typeof (protocol) == 'string' && ['http', 'https'].includes(protocol) ? protocol.trim() : false;
    method = typeof (method) == 'string' && ['get', 'post', 'put', 'delete'].includes(method) ? method : false;
    state = typeof (state) == 'string' && ['up', 'down'].includes(state) ? state : 'down';
    url = typeof (url) == 'string' && url.trim().length > 0 ? url.trim() : false;
    successCode = Array.isArray(successCode) && successCode.length > 0 ? successCode : false;
    timeoutSeconds = typeof (timeoutSeconds) == 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;
    lastChecked = typeof (lastChecked) == 'number' && lastChecked > 0 ? lastChecked : false;

    if (id ||
        !userPhone ||
        !protocol ||
        !method ||
        !url ||
        !successCode ||
        !timeoutSeconds) {
        console.log('Error: One of the checks is not properly formatted!');
    }
    //TODO: performing check data
}

workers.init = () => {
    workers.gatherAllChecks();
    workers.loop();
}

module.exports = workers;