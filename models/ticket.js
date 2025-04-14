const oracledb = require('oracledb');

const dbConfig = {
    user: 'sys',
    password: 'Aryan2023030#',
    connectString: 'localhost/orcl'
};

async function createPost(postData) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
            `INSERT INTO tickets (id, user_id, fr_, to_, mode_, price, is_cancelled, ticket_date)
             VALUES (ticket_seq.NEXTVAL, :user_id, :fr_, :to_, :mode_, :price, :is_cancelled, :ticket_date)
             RETURNING id INTO :id`,
            {
                user_id: postData.user_id,
                fr_: postData.fr_,
                to_: postData.to_,
                mode_: postData.mode_,
                price: postData.price,
                is_cancelled: postData.is_cancelled,
                ticket_date: postData.ticket_date,
                id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            },
            { autoCommit: true }
        );

        console.log('Post created with ID:', result.outBinds.id[0]);
        return result.outBinds.id[0];
    } catch (err) {
        console.error('Error creating post:', err);
        throw err;
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
        connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
            `SELECT * FROM tickets WHERE id = :id`,
            { id: postId }
        );

        return result.rows;
    } catch (err) {
        console.error('Error fetching post:', err);
        throw err;
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