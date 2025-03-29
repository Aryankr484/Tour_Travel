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
           
            `INSERT INTO users (username, name, email, password, age, gender, phone, profilepic,rating, guide) VALUES (:username, :name, :email, :password, :age, :gender, :phone, :profilepic,:rating, :guide)`,
            
            {
                username: userData.username,
                name: userData.name,
                email: userData.email,
                password: userData.password,
                age: userData.age,
                gender: userData.gender,
                phone: userData.phone,
                profilepic: userData.profilepic || 'default.png',
                rating: userData.rating || 0,
                guide: userData.guide


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

async function getUserById(userId) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl'
        });

        const result = await connection.execute(
            `SELECT * FROM users WHERE id = :id`,
            { id: userId }
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