const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');

class _events extends events { };

const e = new _events();
let cli = {};

cli.init = function () {
    console.log('\x1b[34m%s\x1b[0m', 'Background CLI is running');
    var _interface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: ''
    })
}