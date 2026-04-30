const express = require("express")
const app = express()
const cors = require("cors")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const multer = require("multer")
const session = require("express-session")
const passport = require("passport")
const GitHubStrategy = require("passport-github2").Strategy

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})
const upload = multer({ storage })
require("dotenv").config()

app.use(cors())
app.use(express.static(__dirname + "/public"))
app.use(express.static(__dirname + "/uploads"))
app.use(bodyParser.json())
app.use(session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log("Connected to DB")
})

const userSchema = mongoose.Schema({
    username: String,
    password: String,
    email: String,
    phoneno: String,
    role: String,
    date: {
        type: Date,
        default: Date.now
    }
})

const reportschema = mongoose.Schema({
    issue_name: String,
    issue_description: String,
    issue_image: String,
    issue_status: {
        type: String,
        default: "Pending"
    },
    issue_date: {
        type: Date,
        default: Date.now
    },
    issue_address: String,
    userId: String
})

const userModel = mongoose.model("janVoice_users", userSchema)
const reportModel = mongoose.model("janVoice_reports", reportschema)

passport.serializeUser((user, done) => {
    done(null, user._id)
})

passport.deserializeUser((id, done) => {
    userModel.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err))
})

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback",
    scope: ["user:email"]
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const githubEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.com`
        let user = await userModel.findOne({ email: githubEmail })
        if (!user) {
            user = await userModel.create({
                username: profile.username,
                password: "",
                email: githubEmail,
                role: "user"
            })
        }
        return done(null, user)
    } catch (error) {
        return done(error)
    }
}))

app.get("/auth/github", passport.authenticate("github"))

app.get("/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/loginform.html" }),
    (req, res) => {
        res.redirect("/auth/github/success")
    }
)

app.get("/auth/github/success", (req, res) => {
    if (!req.user) {
        return res.redirect("/loginform.html")
    }

    const user = {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
    }

    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>GitHub Login Success</title></head>
<body>
<script>
    localStorage.setItem('user', JSON.stringify(${JSON.stringify(user)}))
    window.location.href = ${JSON.stringify(req.user.role === 'admin' ? '/adminPage.html' : '/reports.html')}
</script>
</body>
</html>`)
})

app.post("/register", (req, res) => {
    const new_user = new userModel({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        phoneno: req.body.phoneno,
        role: req.body.role
    })
    console.log(req.body)
    new_user.save().then(() => {
        console.log("data added")
        console.log(process.env.MONGODB_URI)
        res.json({ role: new_user.role })
    })
})

app.get("/getAllIssues", (req, res) => {
    reportModel.find()
        .then((data) => {
            res.json(data)
        })
})

app.post("/login", (req, res) => {
    const { username, password, role } = req.body
    userModel.findOne({ username, password, role })
        .then((user) => {
            if (user) {
                res.json({ success: true, user })
            }
            else {
                res.json({ success: false })
            }
        })
})

app.post("/addIssue", upload.single("issue_image"), (req, res) => {
    const new_report = new reportModel({
        issue_name: req.body.issue_name,
        issue_description: req.body.issue_description,
        issue_image: req.file.filename,
        issue_address: req.body.issue_address,
        userId: req.body.userId
    })
    new_report.save().then(() => {
        res.json({ msg: "success" })
    })
})

app.get("/getmyIssues/:id", (req, res) => {
    reportModel.find({ userId: req.params.id })
        .then((data) => {
            res.json(data)
        })
})

app.listen(3000, () => {
    console.log("Hey Raj! Your backend server is running on port:3000")
})
