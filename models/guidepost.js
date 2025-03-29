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
            
            `INSERT INTO guidePosts (user_id, rating) VALUES (:user_id, :rating)`,
            {
                user_id: postData.user_id,
                rating: postData.rating
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
            user: 'SYSDBA',
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