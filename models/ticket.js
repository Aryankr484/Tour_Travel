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
            
            `INSERT INTO tickets (user_id, fr_, to_,mode_, ticket_date) VALUES (:user_id, :fr_, :to_,:mode_,:price, :ticket_date)`,
            {
                user_id: postData.user_id,
                fr_: postData.fr_,
                to_: postData.to_,
                mode:postData.mode_,
                price: postData.price,
                ticket_date: postData.ticket_date
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