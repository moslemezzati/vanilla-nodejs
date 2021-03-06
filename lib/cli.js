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
    });
    _interface.prompt();
    _interface.on('line', str => {
        cli.processInput(str);
        _interface.prompt();
    });
    _interface.on('close', () => {
        process.exit(0);
    })
}

cli.processInput = str => {
    str = typeof (str) == 'string' && str.trim().length > 0 ? str : false;
    if (!str) {
        return;
    }
    const uniqueInputs = [
        'man',
        'help',
        'exit',
        'stats',
        'list users',
        'more user info',
        'list checks',
        'more check info',
        'list logs',
        'more log info'
    ]
    const commandIndex = uniqueInputs.indexOf(str);
    if (commandIndex == -1) {
        return console.log('Sorry, try again');
    }
    e.emit(uniqueInputs[commandIndex], str);
}

module.exports = cli;