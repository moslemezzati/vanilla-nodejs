const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');

class _events extends events { };

const e = new _events();
let cli = {};
cli.responders = {};

e.on('help', () => {
    cli.responders.help();
});

e.on('man', () => {
    cli.responders.help();
});

e.on('stats', () => {
    cli.responders.stats();
});

e.on('exit', () => {
    cli.responders.exit();
});

e.on('list users', () => {
    cli.responders.listUsers();
});

e.on('more user info', str => {
    cli.responders.moreUserInfo(str);
});

e.on('list checks', str => {
    cli.responders.listChecks(str);
});

e.on('more check info', str => {
    cli.responders.moreCheckInfo(str);
});

e.on('list logs', str => {
    cli.responders.listLogs();
});

e.on('more log info', str => {
    cli.responders.moreLogInfo(str);
});

cli.responders.help = () => {
    console.log('You asked for help');
}

cli.responders.exit = () => {
    process.exit(0);
}

cli.responders.stats = () => {
    console.log('You asked for stats');
}

cli.responders.listUsers = () => {
    console.log('You asked for list users');
}

cli.responders.moreUserInfo = str => {
    console.log('You asked for more user info', str);
}

cli.responders.listChecks = str => {
    console.log('You asked for list checks', str);
}

cli.responders.moreCheckInfo = str => {
    console.log('You asked for check info', str);
}

cli.responders.listLogs = () => {
    console.log('You asked to list logs');
}

cli.responders.moreLogInfo = () => {
    console.log('You asked for more log info');
}

cli.init = function () {
    console.log('\x1b[34m%s\x1b[0m', 'Background CLI is running');
    var _interface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '>'
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
    let matchFount = false;
    uniqueInputs.some(input => {
        if(str.indexOf(input) > -1){
            matchFount = true;
            e.emit(input, str);
            return true;
        } 
    });
    if(!matchFount){
        console.log('Sorry, try again');
    }
}

module.exports = cli;