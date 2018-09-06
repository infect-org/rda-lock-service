const envr = require('envr');


module.exports = {
    registryHost: 'http://l.dns.porn:9000',
    db: {
        type: 'postgres',
        database: 'infect',
        schema: 'rda_lock_service',
        hosts: [{
            host: '10.80.100.1',
            username: 'postgres',
            password: envr.get('dbPass'),
            port: 5432,
            pools: ['read', 'write'],
            maxConnections: 20,
        }],
    },
};
