var environments = {};

environments.development = {
    port: 3000,
    secretKey: 'silence is our ammunition!'
}
environments.production = {
    port: 5000,
    secretKey: 'lie is a standard procedure!'
}

var environmentName = typeof (process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';
var environmentToExport = typeof (environments[environmentName]) === 'object' ? environments[environmentName] : environments.development;

module.exports = environmentToExport;