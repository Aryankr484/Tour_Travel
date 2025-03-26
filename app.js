const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const postModel = require('./models/post');
const userModel = require('./models/user');
app.set('view engine', 'ejs');
const upload = require('./config/multerconfig');
const { name } = require('ejs');

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

function isLoggedIn(req, res, next) {
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
    let user = await userModel.findOne({ email });
    if (user) {
        return res.status(500).send("user already registered");
    }
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                name,
                age,
                email,
                gender,
                phone,
                password: hash
            });
            let token = jwt.sign({ email: email, userid: user._id }, "shhh");
            res.cookie('token', token);
            res.send("registered");
        });
    });
});

app.post('/upload', isLoggedIn, upload.single("image"), async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
});

app.post('/delete', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    user.profilepic = "default.png";
    await user.save();
    res.redirect("/profile");
});

app.get('/login', (req, res) => {
    res.render("login");
});

app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email });
    if (!user) {
        return res.status(500).send("User not found");
    }
    bcrypt.compare(password, user.password, function (err, result) {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhh");
            res.cookie('token', token);
            res.status(200).redirect("/profile");
        } else {
            res.status(401).send("Invalid credentials");
        }
    });
});

app.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate("posts");
    res.render("profile", { user });
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");
    if (post.likes.indexOf(req.user.userid) == -1) {
        post.likes.push(req.user.userid);
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect("/profile");
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");
    res.render("edit", { post });
});

app.get('/delete/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndDelete({ _id: req.params.id });
    res.redirect("/profile");
});
// { content: req.body.content }
app.post('/update/:id', isLoggedIn, async (req, res) => {
    let { name, age, gender, phone }=req.body;
    let post = await postModel.findOneAndUpdate({ _id: req.params.id },{ name, age,gender, phone },
        { new: true });
    res.redirect("/profile");
});

// app.post('/post', isLoggedIn, async (req, res) => {
//     let user = await userModel.findOne({ email: req.user.email });
//     let { content } = req.body;
//     let post = await postModel.create({
//         user: user._id,
//         content
//     });
//     user.posts.push(post._id);
//     await user.save();
//     res.redirect("/profile");
// });
app.post('/post', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let { name, age, gender, phone } = req.body;
    let post = await postModel.create({
        user: user._id,
        name,
        age,
        gender,
        phone
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});
app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});