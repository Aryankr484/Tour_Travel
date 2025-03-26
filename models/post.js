const oracledb = require('oracledb');


async function createPost(postData) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl'
        });

        const result = await connection.execute(
            `INSERT INTO posts (user_id, name, age, gender, phone) VALUES (:user_id, :name, :age, :gender, :phone)`,
            {
                user_id: postData.user_id,
                name: postData.name,
                age: postData.age,
                gender: postData.gender,
                phone: postData.phone
            },
            { autoCommit: true }
        );

        console.log('Post created:', result);
    } catch (err) {
        console.error('Error creating post:', err);
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

async function getPostById(postId) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl'
        });

        const result = await connection.execute(
            `SELECT * FROM posts WHERE id = :id`,
            { id: postId }
        );

        return result.rows;
    } catch (err) {
        console.error('Error fetching post:', err);
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
    createPost,
    getPostById
};