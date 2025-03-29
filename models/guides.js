const oracledb = require('oracledb');

async function createUser(userData) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'SYSDBA',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl'
        });

        const result = await connection.execute(
           
            `INSERT INTO guides (g_username, g_name, g_email, g_password, g_age, g_gender, g_phone, g_profilepic) VALUES (:g_username, :g_name, :g_email, :g_password, :g_age, :g_gender, :g_phone, :g_profilepic)`,
            
            {
                username: userData.g_username,
                name: userData.g_name,
                email: userData.g_email,
                password: userData.g_password,
                age: userData.g_age,
                gender: userData.g_gender,
                phone: userData.g_phone,
                profilepic: userData.g_profilepic || 'default.png'
            },
            { autoCommit: true }
        );

        console.log('User created:', result);
    } catch (err) {
        console.error('Error creating user:', err);
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

async function getUserById(guideId) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl'
        });

        const result = await connection.execute(
            `SELECT * FROM guides WHERE id = :id`,
            { id: guideId }
        );

        return result.rows;
    } catch (err) {
        console.error('Error fetching user:', err);
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
    createUser,
    getUserById
};