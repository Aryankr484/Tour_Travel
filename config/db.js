const oracledb = require('oracledb');

async function initialize() {
    try {
        await oracledb.createPool({
            user: 'your_username',
            password: 'your_password',
            connectString: 'your_connect_string'
        });
        console.log('Oracle Database connection pool started');
    } catch (err) {
        console.error('Error initializing Oracle Database connection pool', err);
        process.exit(1);
    }
}

async function close() {
    try {
        await oracledb.getPool().close(10);
        console.log('Oracle Database connection pool closed');
    } catch (err) {
        console.error('Error closing Oracle Database connection pool', err);
    }
}

module.exports = {
    initialize,
    close
};