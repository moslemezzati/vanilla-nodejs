var environments = {};

environments.development = {
    port: 3000,
    secretKey: 'silence is our ammunition!',
    maxChecks: 5,
    twilio: {
        'accountSid': 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken': '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone': '+15005550006'
    },
    templateGlobals: {
        appName: 'UptimeChecker',
        companyName: 'NotARealCompany, Inc.',
        yearCreated: '2018',
        baseUrl: 'http://localhost:3000/'
    }
}
environments.production = {
    port: 5000,
    secretKey: 'lie is a standard procedure!',
    maxChecks: 5,
    twilio: {},
    templateGlobals: {
        appName: 'UptimeChecker',
        companyName: 'NotARealCompany, Inc.',
        yearCreated: '2018',
        baseUrl: 'http://localhost:5000/'
    }
}

var environmentName = typeof (process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';
var environmentToExport = typeof (environments[environmentName]) === 'object' ? environments[environmentName] : environments.development;

module.exports = environmentToExport;
