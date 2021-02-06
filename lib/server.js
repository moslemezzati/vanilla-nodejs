const http = require('http');
const config = require('../config');
const { StringDecoder } = require('string_decoder');
const url = require('url');

const { handlers: usersHandler } = require('./users');
const helpers = require('./helpers');
const checksHandler = require('./checks');
const util = require('util');
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
        const _handler = server.router[trimmedPath] ? server.router[trimmedPath] : server.router.notFound;
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer),
        }
        _handler(data, (statusCode, payload) => {
            statusCode = typeof (statusCode) === 'number' ? statusCode : 200;
            payload = typeof (payload) === 'object' ? payload : {};
            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            if (statusCode === 200 || statusCode === 201) {
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            }else{
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            }
        });
    })

});

server.router = {
    notFound: (data, callback) => {
        callback(404, { Error: 'There is no handler for this request', data });
    },
    users: usersHandler.users,
    tokens: usersHandler.tokens,
    checks: checksHandler.checks,
}

server.init = () => {
    server.httpServer.listen(config.port, () => {
        console.log('The app is running on port', config.port);
    });
}

module.exports = server;