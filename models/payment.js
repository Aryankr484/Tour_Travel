const oracledb = require('oracledb');

// Function to create a payment record
async function createPayment(paymentData) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        const result = await connection.execute(
            `INSERT INTO payments (user_id, amount, currency, payment_status, session_id) 
             VALUES (:user_id, :amount, :currency, :payment_status, :session_id)`,
            {
                user_id: paymentData.user_id,
                amount: paymentData.amount,
                currency: paymentData.currency,
                payment_status: paymentData.payment_status,
                session_id: paymentData.session_id
            },
            { autoCommit: true }
        );

        console.log('Payment created:', result);
        return result;
    } catch (err) {
        console.error('Error creating payment:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err);
            }
        }
    }
}

// Function to fetch a payment record by ID
async function getPaymentById(paymentId) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        const result = await connection.execute(
            `SELECT * FROM payments WHERE id = :id`,
            { id: paymentId }
        );

        return result.rows;
    } catch (err) {
        console.error('Error fetching payment:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err);
            }
        }
    }
}

// Function to fetch all payments for a specific user
async function getPaymentsByUserId(userId) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        const result = await connection.execute(
            `SELECT * FROM payments WHERE user_id = :user_id ORDER BY payment_date DESC`,
            { user_id: userId }
        );

        return result.rows;
    } catch (err) {
        console.error('Error fetching payments:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err);
            }
        }
    }
}

module.exports = {
    createPayment,
    getPaymentById,
    getPaymentsByUserId
};