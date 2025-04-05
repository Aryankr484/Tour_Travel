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
const axios = require('axios');

async function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }
    try {
        const data = jwt.verify(token, "shhh");
        req.user = data; // Set req.user.email and req.user.userid
        next();
    } catch {
        return res.redirect('/login');
    }
}

app.get('/', (req, res) => {
    res.render("index");
});
// app.get('/example', (req, res) => {
//     res.render("example");
// });
app.get('/api/city', async (req, res) => {
    const cityName = req.query.name || 'San Francisco'; // Get the city name from query parameters (default: San Francisco)
    const apiKey = 'QVBVUMjndun3T51lNkJd1A==H1YkrpkzikaUWirb'; // Hardcoded API key

    try {
        // Make a GET request to the external API
        const response = await axios.get(`https://api.api-ninjas.com/v1/city`, {
            headers: {
                'X-Api-Key': apiKey // Pass the API key in the headers
            },
            params: {
                name: cityName // Pass the city name as a query parameter
            }
        });

        // Send the API response back to the client
        res.json({ success: true, data: response.data });
    } catch (err) {
        console.error('Error fetching city data:', err.response?.data || err.message);
        res.status(500).json({ success: false, message: 'Error fetching city data' });
    }
});

app.get('/api/city-suggestions', async (req, res) => {
    const query = req.query.name || ''; // Get the query from the request
    const apiKey = 'QVBVUMjndun3T51lNkJd1A==H1YkrpkzikaUWirb'; // API key

    try {
        // Fetch city suggestions from the external API
        const response = await axios.get(`https://api.api-ninjas.com/v1/city`, {
            headers: {
                'X-Api-Key': apiKey
            },
            params: {
                name: query
            }
        });

        res.json({ success: true, cities: response.data });
    } catch (err) {
        console.error('Error fetching city suggestions:', err.response?.data || err.message);
        res.status(500).json({ success: false, message: 'Error fetching city suggestions' });
    }
});
// Start the server


app.get('/profile/upload', isLoggedIn, (req, res) => {
    res.render("profileupload");
});
app.get('/register', isLoggedIn, (req, res) => {
    res.render("register");
});
app.get('/login', (req, res) => {
    res.render("login");
});
app.get('/destination', isLoggedIn, async (req, res) => {
    let connection;
    try {
        console.log("User email:", req.user.email); // Debugging
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

        if (result.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        const user = result.rows[0];

        // Fetch posts associated with the user
        const postsResult = await connection.execute(
            `SELECT * FROM posts WHERE user_id = :user_id`,
            { user_id: user.ID }
        );
        user.posts = postsResult.rows;

        res.render("destination", { user });
    } catch (err) {
        console.error("Error in /destination route:", err);
        res.status(500).send("Error fetching profile");
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
        const userResult = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email: req.user.email }
        );

        if (userResult.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        const user = userResult.rows[0];

        // Fetch posts associated with the user
        const postsResult = await connection.execute(
            `SELECT * FROM posts WHERE user_id = :user_id`,
            { user_id: user.ID }
        );

        // Fetch the most recent location details
        const locationResult = await connection.execute(
            `SELECT fr_, to_, mode_ FROM locations WHERE user_id = :user_id ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
            { user_id: user.ID }
        );
        const location = locationResult.rows[0] || { fr_: null, to_: null, mode_: null };

        // Fetch country information using the city API
        let country = 'India'; // Default to India
        if (location.TO_) {
            try {
                const response = await axios.get(`http://localhost:3000/api/city`, {
                    params: { name: location.TO_ } // Pass the destination city name
                });

                if (response.data.success && response.data.data.length > 0) {
                    country = response.data.data[0].country || 'India'; // Extract the country field
                }
            } catch (err) {
                console.error('Error fetching country information:', err.message);
            }
        }

        user.posts = postsResult.rows || []; // Ensure posts is always an array

        const ticketBooked = user.TICKETBOOKED === 1;
        const rating = user.RATING;
        const review = user.REVIEW;

        // Pass the country to the profile page
        res.render("profile", {
            user,
            ticketBooked,
            rating,
            review,
            fr_: location.FR_,
            to_: location.TO_,
            mode_: location.MODE_,
            country // Pass the country to the template
        });
    } catch (err) {
        console.error("Error in /profile route:", err);
        res.status(500).send("Error fetching profile");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing database connection:", err);
            }
        }
    }
});
app.get('/rate', isLoggedIn, async (req, res) => {
    let { fr_, to_, mode_,price } = req.query;
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Fetch user details, including the review
        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email: req.user.email }
        );

        if (result.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        const user = result.rows[0];
        const rating = user.RATING; // Assuming the column name is RATING
        const review = user.REVIEW; // Assuming the column name is REVIEW

        // Fetch the most recent ticket's duration
        const ticketResult = await connection.execute(
            `SELECT duration FROM tickets WHERE user_id = :user_id ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
            { user_id: user.ID }
        );
        const ticket = ticketResult.rows[0] || { duration: null };
        console.log("Duration fetched from tickets:", ticket.DURATION); // Debugging

        // Fetch posts associated with the user
        const postsResult = await connection.execute(
            `SELECT * FROM posts WHERE user_id = :user_id`,
            { user_id: user.ID }
        );
        user.posts = postsResult.rows;

        // Render the rate page with the user's rating, review, and duration
        res.render("rate", {
            user,
            ticketBooked: user.TICKETBOOKED === 1,
            rating,
            review,
            fr_,
            to_,
            mode_,
            duration: ticket.DURATION,
            price // Pass duration to the template

        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading rate page");
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
app.get('/previous-tickets', isLoggedIn, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Fetch all previous tickets for the logged-in user
        const ticketsResult = await connection.execute(
            `SELECT id, fr_, to_, mode_,duration, ticket_date, rating, review 
             FROM tickets 
             WHERE user_id = :user_id 
             ORDER BY ticket_date DESC`,
            { user_id: req.user.userid }
        );

        const tickets = ticketsResult.rows || []; // Ensure tickets is always an array

        res.render("previous-tickets", { tickets });
    } catch (err) {
        console.error("Error in /previous-tickets route:", err);
        res.status(500).send("Error fetching previous tickets");
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
            return res.render("register", { message: "User already registered", isSuccess:false });

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
        return res.render("register",{message: "User successfully registerd", isSuccess: true})
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

        // Fetch user details
        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email }
        );

        if (result.rows.length === 0) {
            return res.status(500).send("User not found");
        }

        const user = result.rows[0];

        // Verify password
        const match = await bcrypt.compare(password, user.PASSWORD);
        if (match) {
            const token = jwt.sign({ email: email, userid: user.ID }, "shhh");
            res.cookie('token', token);

            // Fetch posts associated with the user
            const postsResult = await connection.execute(
                `SELECT * FROM posts WHERE user_id = :user_id`,
                { user_id: user.ID }
            );
            user.posts = postsResult.rows;

            // Pass the ticketBooked status and rating to the profile page
            // Fetch the rating from the user object
            return res.render("destination", { message: "Logged in successfully", isSuccess: true,user });
           
        } else {
            return res.render("login", { message: "Incorrect email or password", isSuccess: false });
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

app.post('/confirm', isLoggedIn, async (req, res) => {
    let{fr_, to_, mode_, duration,price} = req.body;
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Update the ticketBooked status in the database
        await connection.execute(
            `INSERT INTO tickets (user_id, fr_, to_,mode_, duration) VALUES (:user_id, :fr_, :to_, :mode_, :duration)`,
            { user_id: req.user.userid, fr_, to_, mode_, duration},
            { autoCommit: true }
        );
        await connection.execute(
            `UPDATE users SET ticketBooked = 1 WHERE email = :email`,
            { email: req.user.email },
            { autoCommit: true }
        );

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

        // Render the profile page with ticketBooked set to true
        res.render("rate", { user, ticketBooked: true,  rating:req.body.rating, review:req.body.review, fr_, to_, mode_, duration, price});
        // res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error Booking Ticket");
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
app.post('/delete-ticket', isLoggedIn, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Reset ticketBooked status in the users table
        await connection.execute(
            `UPDATE users SET ticketBooked = 0 WHERE email = :email`,
            { email: req.user.email },
            { autoCommit: true }
        );

        // Delete all associated passenger details from the posts table
        await connection.execute(
            `DELETE FROM guidePosts WHERE user_id = :user_id`,
            { user_id: req.user.userid },
            { autoCommit: true }
        );
        await connection.execute(
            `DELETE FROM posts WHERE user_id = :user_id`,
            { user_id: req.user.userid },
            { autoCommit: true }
        );


        res.redirect('/profile'); // Redirect back to the profile page
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting ticket");
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
        
        res.redirect('/profile');
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
app.post('/submit', isLoggedIn, async (req, res) => {
    let { fr_, to_, mode_ } = req.body;
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Insert into the locations table
        await connection.execute(
            `INSERT INTO locations (user_id, fr_, to_, mode_) VALUES (:user_id, :fr_, :to_, :mode_)`,
            { user_id: req.user.userid, fr_, to_, mode_ },
            { autoCommit: true }
        );

        // Fetch country information using the city API
        let country = 'India'; // Default to India
        if (to_) {
            try {
                const response = await axios.get(`http://localhost:3000/api/city`, {
                    params: { name: to_ } // Pass the destination city name
                });

                if (response.data.success && response.data.data.length > 0) {
                    country = response.data.data[0].country || 'India'; // Extract the country field
                }
            } catch (err) {
                console.error('Error fetching country information:', err.message);
            }
        }

        // Fetch user details
        const userResult = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email: req.user.email }
        );

        if (userResult.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        const user = userResult.rows[0];

        // Fetch posts associated with the user
        const postsResult = await connection.execute(
            `SELECT * FROM posts WHERE user_id = :user_id`,
            { user_id: user.ID }
        );
        user.posts = postsResult.rows || []; // Ensure posts is always an array

        const ticketBooked = user.TICKETBOOKED === 1;
        const rating = user.RATING;
        const review = user.REVIEW;

        // Render the profile page with the country information
        res.render("profile", { user, ticketBooked, rating, review, fr_, to_, mode_, country });
    } catch (err) {
        console.error("Error in /submit route:", err);
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
    const { fr_, to_, mode_, duration, price, rating, review } = req.body; // Extract price, rating, and review from the request body
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Update the ticket with the rating, review, and price
        await connection.execute(
            `UPDATE tickets 
             SET rating = :rating, review = :review, price = :price
             WHERE user_id = :user_id AND fr_ = :fr_ AND to_ = :to_ AND mode_ = :mode_ AND duration = :duration AND ticket_date = (
                 SELECT MAX(ticket_date) FROM tickets WHERE user_id = :user_id
             )`,
            { user_id: req.user.userid, fr_, to_, mode_, duration, price, rating, review },
            { autoCommit: true }
        );

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

        // Redirect to the previous tickets page
        res.redirect('/previous-tickets');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating ticket");
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
app.post('/delete-previous-ticket', isLoggedIn, async (req, res) => {
    const { ticket_id } = req.body; // Extract the ticket ID from the request body
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl',
            privilege: oracledb.SYSDBA
        });

        // Delete the ticket with the specified ID
        await connection.execute(
            `DELETE FROM tickets WHERE id = :ticket_id`,
            { ticket_id },
            { autoCommit: true }
        );

        res.redirect('/previous-tickets'); // Redirect back to the previous tickets page
    } catch (err) {
        console.error("Error in /delete-previous-ticket route:", err);
        res.status(500).send("Error deleting ticket");
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


// app.post('/review', isLoggedIn, async (req, res) => {
//     let connection;
//     try {
//         connection = await oracledb.getConnection({
//             user: 'sys',
//             password: 'Aryan2023030#',
//             connectString: 'localhost/orcl',
//             privilege: oracledb.SYSDBA
//         });

//         // Fetch user details
//         const result1 = await connection.execute(
//             `INSERT INTO guidePosts (user_id, email, rating, review) VALUES (:user_id,:email, :rating, :review)`,
//             { user_id: req.user.userid, email:req.user.email, rating: req.body.rating, review: req.body.review},
//             { autoCommit: true }
//         );
//         // const result2 = await connection.execute(
//         //     `UPDATE users SET rating = :rating WHERE email = :email`,
//         //     { rating: req.body.rating, email: req.user.email },
//         //     { autoCommit: true }
//         // );
//         const result3 = await connection.execute(
//             `UPDATE users SET review = :review WHERE email = :email`,
//             { review: req.body.review, email: req.user.email },
//             { autoCommit: true }
//         );
//         const result = await connection.execute(
//             `SELECT * FROM users WHERE email = :email`,
//             { email: req.user.email }
//         );
//         const user = result.rows[0];

//         // Fetch posts associated with the user
//         const postsResult = await connection.execute(
//             `SELECT * FROM posts WHERE user_id = :user_id`,
//             { user_id: user.ID }
//         );
//         user.posts = postsResult.rows;

//         // Set ticketBooked to true and re-render the profile page
//         res.render("rate",{user, ticketBooked: 1, rating: req.body.rating, review: req.body.review});
//     } catch (err) {
//         console.error(err);
//         res.status(500).send("Error booking ticket");
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