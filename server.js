const express = require("express")
const app = express()
const cors = require("cors")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const multer = require("multer")
 
app.listen(3000, () => {
    console.log("Hey Raj! Your backend server is running on port:3000")
})


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
        res.json({success:true })
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

app.post("/exploreIssue",(req,res)=>{
   userModel.find({_id:req.body.userId})
   .then((data)=>{
    res.json(data)
   })
})

app.post("/updateIssue",(req,res)=>{
    reportModel.findById(req.body.issueId)
    .then((data)=>{

    if(data.issue_status=="Pending"){
            reportModel.updateOne({_id:req.body.issueId},{$set:{issue_status:"Assigned"}})
            .then(()=>{
                res.json({msg:"issue Assigned"})
            })
    }

    else if(data.issue_status=="Assigned"){
        reportModel.updateOne({_id:req.body.issueId},{$set:{issue_status:"Resolved"}})
        .then(()=>{
            res.json({msg:"issue Resolved"})
        })
    }

    else{
        res.json({msg:"issue already resolved"})
    }

})
})

app.post("/deleteIssue",(req,res)=>{
    reportModel.findByIdAndDelete(req.body.issueId)
    .then((data)=>{
        res.json({msg:"issue deleted",data})
    })
})

app.post("/getIssuesByStatus",(req,res)=>{
    if(req.body.issue_status==="all"){
        reportModel.find()
        .then((data)=>{
            res.json(data)
        })
    }
    else{
        reportModel.find({issue_status:req.body.issue_status})
        .then((data)=>{
            res.json(data)
        })
    }
})

app.post("/getmyIssuesByStatus",(req,res)=>{
    if(req.body.issue_status==="all"){
        reportModel.find({userId:req.body.userId})
        .then((data)=>{
            res.json(data)
        })
    }
    else{
        reportModel.find({issue_status:req.body.issue_status, userId:req.body.userId})
        .then((data)=>{
            res.json(data)
        })
    }
})