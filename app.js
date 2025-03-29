const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const oracledb = require('oracledb');
oracledb.outFormat=oracledb.OUT_FORMAT_OBJECT;
const db = require('./config/db'); // Require the db.js file
const upload = require('./config/multerconfig');

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

async function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }
    try {
        const data = jwt.verify(token, "shhh");
        req.user = data;
        next();
    } catch {
        return res.redirect('/login');
    }
}

app.get('/', (req, res) => {
    res.render("index");
});

app.get('/profile/upload', isLoggedIn, (req, res) => {
    res.render("profileupload");
});

app.post('/register', async (req, res) => {
    let { email, password, username, name, age, gender, phone } = req.body;
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });
        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email }
        );
        if (result.rows.length > 0) {
            return res.status(500).send("User already registered");
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await connection.execute(
            `INSERT INTO users (username, name, age, email, gender, phone, password) VALUES (:username, :name, :age, :email, :gender, :phone, :password)`,
            { username, name, age, email, gender, phone, password: hash },
            { autoCommit: true }
        );
        const token = jwt.sign({ email: email, userid: result.insertId }, "shhh");
        res.cookie('token', token);
        res.send("Registered");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error registering user");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

app.post('/upload', isLoggedIn, upload.single("image"), async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });
        await connection.execute(
            `UPDATE users SET profilepic = :profilepic WHERE email = :email`,
            { profilepic: req.file.filename, email: req.user.email },
            { autoCommit: true }
        );
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error uploading profile picture");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

app.post('/delete', isLoggedIn, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });
        await connection.execute(
            `UPDATE users SET profilepic = 'default.png' WHERE email = :email`,
            { email: req.user.email },
            { autoCommit: true }
        );
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting profile picture");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

app.get('/login', (req, res) => {
    res.render("login");
});

app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });
        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email }
        );
        if (result.rows.length === 0) {
            return res.status(500).send("User not found");
        }
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.PASSWORD);
        if (match) {
            const token = jwt.sign({ email: email, userid: user.ID }, "shhh");
            res.cookie('token', token);
            res.status(200).redirect("/profile");
        } else {
            res.status(401).send("Invalid credentials");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error logging in");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

app.get('/profile', isLoggedIn, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Fetch user details
        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email: req.user.email }
        );
        const user = result.rows[0];

        // Fetch posts associated with the user
        const postsResult = await connection.execute(
            `SELECT * FROM posts WHERE user_id = :user_id`,
            { user_id: user.ID }
        );
        user.posts = postsResult.rows;

        // Fetch user's rating (latest rating)
        const ratingResult = await connection.execute(
            `SELECT rating FROM guidePosts WHERE user_id = :user_id ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
            { user_id: user.ID }
        );

        // Extract rating (set to null if no rating found)
        const rating = ratingResult.rows.length > 0 ? ratingResult.rows[0][0] : null;

        // Pass rating and ticketBooked status to the template
        res.render("profile", { user, ticketBooked: user.ticketBooked});
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading profile");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});
app.get('/rate', isLoggedIn, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Fetch user details
        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email: req.user.email }
        );
        const user = result.rows[0];

        // Fetch posts associated with the user
        const postsResult = await connection.execute(
            `SELECT * FROM posts WHERE user_id = :user_id`,
            { user_id: user.ID }
        );
        user.posts = postsResult.rows;
        res.render("rate", { user, ticketBooked: true, rating: user.rating });
        // Fetch user's rating (latest rating)
        const ratingResult = await connection.execute(
            `SELECT rating FROM guidePosts WHERE user_id = :user_id ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
            { user_id: user.ID }
        );

        // Extract rating (set to null if no rating found)
        const rating = ratingResult.rows.length > 0 ? ratingResult.rows[0][0] : null;

        // Pass rating and ticketBooked status to the template
        // res.render("rate", { user, ticketBooked: user.ticketBooked});
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading profile");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });
        const result = await connection.execute(
            `SELECT * FROM posts WHERE id = :id`,
            { id: req.params.id }
        );
        const post = result.rows[0];
        res.render("edit", { post });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching post");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

app.get('/delete/:id', isLoggedIn, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });
        await connection.execute(
            `DELETE FROM posts WHERE id = :id`,
            { id: req.params.id },
            { autoCommit: true }
        );
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting post");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});
app.post('/confirm', isLoggedIn, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Fetch user details
        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email: req.user.email }
        );
        const user = result.rows[0];

        // Fetch posts associated with the user
        const postsResult = await connection.execute(
            `SELECT * FROM posts WHERE user_id = :user_id`,
            { user_id: user.ID }
        );
        user.posts = postsResult.rows;

        // Set ticketBooked to true and re-render the profile page
        res.render("rate",{user, ticketBooked: 1, rating:0});
    } catch (err) {
        console.error(err);
        res.status(500).send("Error booking ticket");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

app.post('/update/:id', isLoggedIn, async (req, res) => {
    let { name, age, gender, phone } = req.body;
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });
        const result = await connection.execute(
            `UPDATE posts SET name = :name, age = :age, gender = :gender, phone = :phone WHERE id = :id`,
            { name, age, gender, phone, id: req.params.id },
            { autoCommit: true }
        );

        // Check if the update was successful
        if (result.rowsAffected === 0) {
            return res.status(404).send("Post not found or no changes made");
        }
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating post");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

app.post('/post', isLoggedIn, async (req, res) => {
    let { name, age, gender, phone } = req.body;
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });
        const result = await connection.execute(
            `INSERT INTO posts (user_id, name, age, gender, phone) VALUES (:user_id, :name, :age, :gender, :phone)`,
            { user_id: req.user.userid, name, age, gender, phone },
            { autoCommit: true }
        );
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating post");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});
app.post('/rate', isLoggedIn, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Fetch user details
        const result1 = await connection.execute(
            `INSERT INTO guidePosts (user_id, rating) VALUES (:user_id, :rating)`,
            { user_id: req.user.userid, rating: req.body.rating},
            { autoCommit: true }
        );
        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email: req.user.email }
        );
        const user = result.rows[0];

        // Fetch posts associated with the user
        const postsResult = await connection.execute(
            `SELECT * FROM posts WHERE user_id = :user_id`,
            { user_id: user.ID }
        );
        user.posts = postsResult.rows;

        // Set ticketBooked to true and re-render the profile page
        res.render("rate",{user, ticketBooked: 1, rating: req.body.rating});
    } catch (err) {
        console.error(err);
        res.status(500).send("Error booking ticket");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});
// app.post('/profile/rate', isLoggedIn, async (req, res) => {
//     let { rating } = req.body;  // Extract rating from request body
//     let connection;
//     try {
//         connection = await oracledb.getConnection({
//             user: 'sys',
//             password: 'Aryan2023030#',
//             connectString: 'localhost/orcl',
//             privilege: oracledb.SYSDBA
//         });

//         // Insert into guidePosts table
//         await connection.execute(
//             `INSERT INTO guidePosts (user_id, rating) VALUES (:user_id, :rating)`,
//             { 
//                 user_id: req.user.userid,
//                 rating: rating
//             },
//             { autoCommit: true }
//         );

//         console.log('Rating submitted successfully.');

//         // Fetch user details
//         const result = await connection.execute(
//             `SELECT * FROM users WHERE email = :email`,
//             { email: req.user.email }
//         );

//         if (result.rows.length === 0) {
//             return res.status(404).send("User not found.");
//         }
//         const user = result.rows[0];

//         // Pass user data and rating to profile
//         res.render("profile", { user, ticketBooked:true, rating:rating });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send("Error submitting rating.");
//     } finally {
//         if (connection) {
//             try {
//                 await connection.close();
//             } catch (err) {
//                 console.error(err);
//             }
//         }
//     }
// });


app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/");
});

app.listen(3000, async () => {
    await db.initialize();
    console.log("Server is running on port 3000");
});

process.on('SIGINT', async () => {
    await db.close();
    process.exit(0);
});