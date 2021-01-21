var environments = {};

environments.development = {
    port: 3000,
}
environments.production = {
    port: 5000,
}

var environmentName = typeof (process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';
var environmentToExport = typeof (environments[environmentName]) === 'object' ? environments[environmentName] : environments.development;

module.exports = environmentToExport;
