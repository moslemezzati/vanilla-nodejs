const http = require('http');
const config = require('../config');
const { StringDecoder } = require('string_decoder');
const url = require('url');

const { handlers: usersHandler } = require('./users');
const helpers = require('./helpers');
const checksHandler = require('./checks');
const util = require('util');
const handlers = require('./checks');
const debug = util.debuglog('server');

var server = {};

server.httpServer = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, ''); //remove trial slash
    const queryStringObject = parsedUrl.query;
    const method = req.method.toLowerCase();
    const headers = req.headers;
    const decoder = new StringDecoder('utf-8');
    var buffer = '';

    req.on('data', chunk => {
        buffer += decoder.write(chunk);
    });
    req.on('end', () => {
        let _handler = server.router[trimmedPath] ? server.router[trimmedPath] : server.router.notFound;
        _handler = trimmedPath.includes('public/') ? usersHandler.public : _handler;
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer),
        }
        _handler(data, (statusCode, payload, contentType) => {
            contentType = typeof (contentType) == 'string' ? contentType : 'json';
            statusCode = typeof (statusCode) === 'number' ? statusCode : 200;

            let payloadString = '';
            if (contentType == 'json') {
                payload = typeof (payload) === 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
                res.setHeader('Content-Type', 'application/json');

            } else if (contentType == 'html') {
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof (payload) == 'string' ? payload : '';
            } else if (contentType == 'favicon') {
                res.setHeader('Content-Type', 'text/x-icon');
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            } else if (contentType == 'css') {
                res.setHeader('Content-Type', 'text/css');
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            } else if (contentType == 'png') {
                res.setHeader('Content-Type', 'text/png');
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            } else if (contentType == 'jpeg') {
                res.setHeader('Content-Type', 'text/jpeg');
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            } else if (contentType == 'plain') {
                res.setHeader('Content-Type', 'text/text');
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }

            res.writeHead(statusCode);
            res.end(payloadString);
            if (statusCode === 200 || statusCode === 201) {
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            } else {
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            }
        });
    })

});

server.router = {
    notFound: (data, callback) => {
        callback(404, { Error: 'There is no handler for this request', data });
    },
    'api/users': usersHandler.users,
    'api/tokens': usersHandler.tokens,
    'api/checks': checksHandler.checks,
    'account/create': usersHandler.accountCreate,
    'account/edit': usersHandler.accountEdit,
    'account/deleted': usersHandler.accountDeleted,
    'session/create': usersHandler.sessionCreate,
    'session/deleted': usersHandler.sessionDeleted,
    'checks/all': usersHandler.checksList,
    'checks/create': usersHandler.checksCreate,
    'checks/edit': usersHandler.checksEdit,
    '': usersHandler.index,
    'favicon.ico': usersHandler.favicon,
    'public': usersHandler.public
}

server.init = () => {
    server.httpServer.listen(config.port, () => {
        console.log('The app is running on port', config.port);
    });
}

module.exports = server;