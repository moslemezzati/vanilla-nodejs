const server = require('./lib/server');
const workers = require('./lib/workers');

var app = {};

app.init = () => {
    server.init();
    // workers.init();
}

app.init();

// For testing porpuse
module.exports = app;