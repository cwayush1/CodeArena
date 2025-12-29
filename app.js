if(process.env.NODE_ENV!="production"){
  require("dotenv").config();
}


const express = require("express");
const app = express();
const path = require("path");
const methodoverride = require("method-override");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const ejsMate = require("ejs-mate");
const axios = require("axios");
const session = require("express-session");
const {MongoStore} = require("connect-mongo");
const flash=require("connect-flash");
const passport=require("passport");
const localstrategy=require("passport-local");
const User=require("./models/users.js");
const wrapAsync = require("./utils/wrapAsync.js");
const cheerio = require("cheerio");
const { fetchCodeChef, fetchCodeforces, fetchLeetCode, fetchAtCoder } = require('./utils/allhere.js'); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodoverride("_method"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.engine("ejs", ejsMate);


let dburl=process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("connection was successful");
  })
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(dburl);
}

mongoose.connection.on("connected", () => {
  console.log("Connected to DB:", mongoose.connection.name);
});

const port = 1000;

const store=MongoStore.create({
  mongoUrl:dburl,
  crypto:{
    secret:process.env.SECRET
  },
  touchafter:24*3600
});

store.on("error",(err)=>{
  console.log("ERROR IN MONGO SESSION",err);
});

const seeopt={
  store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+7*24*60*60*1000, 
        maxAge:7*24*60*60*1000,
        httpOnly:true,
    },
};



app.use(session(seeopt));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localstrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(flash());

app.use((req,res,next)=>{
  res.locals.curuser=req.user;
  next();
});


app.get("/",(req,res)=>{
  res.redirect("/api/codearena");
});
app.get("/api/codearena", async(req, res) => {
  let url1= "https://competeapi.vercel.app/contests/upcoming/";
  let url2= "https://contest-hive.vercel.app/api/atcoder";
  try {
    let response1 = await axios.get(url1);
    let response2 = await axios.get(url2);
    let contests = response1.data;
    let contests2 = response2.data.data;

    let codeforces = [];
    let codechef = [];
    let leetcode = [];
    let atcoder = [];

    for (let contest of contests) {
      if (contest.site === "codeforces") {
        codeforces.push(contest);
      } else if (contest.site === "codechef") {
        codechef.push(contest);
      } else if (contest.site === "leetcode") {
        leetcode.push(contest);
      }
    }
    for (let contest of contests2) {
      if (contest.platform === "Atcoder") {
        atcoder.push(contest);
      }
    }

    let separated = [
    codeforces,  
    codechef,   
    leetcode,  
    atcoder    
  ];
    res.render("listings/index.ejs", { separated });

  }catch (err) {
    console.log("error-", err);
  }
});

app.get("/login",(req,res)=>{
  res.render("listings/login.ejs");
});
app.post("/login",passport.authenticate("local",{failureRedirect:"/login",failureFlash:true}),async(req,res)=>{
    res.redirect("/api/codearena");
});
app.get("/signup",(req,res)=>{
  res.render("listings/signup.ejs");
});
app.post("/signup",wrapAsync(async(req,res)=>{
    try {
    let { username, email, password } = req.body;
    const newUser = new User({ username , email});
    const registeredUser = await User.register(newUser, password);
    req.login(registeredUser, (err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/api/codearena/myprofile");
    });
} catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
}
})
);
app.get("/logout",(req,res)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","logged you out");
        res.redirect("/api/codearena");
    });  
});

app.post("/user/add-handle", async (req, res) => {
    try {
        const { platform, handle } = req.body;
        const userId = req.user._id; 

        const user = await User.findById(userId);

        if(user) {
            user[platform] = handle;
            await user.save();
            console.log(`Updated ${platform} for user ${user.username}`);
        }
        res.redirect(`/api/codearena/${user.username}`); 
    } catch (e) {
        console.error(e);
        res.redirect(`/api/codearena/${user.username}`);
    }
});

app.get("/api/codearena/:username",async(req,res)=>{
  if(req.user){
    const user = await User.findById(req.user._id);
    let apiData = { cf: null, cc: null, lc: null, ac: null };

    if (user.codeforceprofile) {
        apiData.cf = await fetchCodeforces(user.codeforceprofile);
    }
    if (user.codechefprofile) {
        apiData.cc = await fetchCodeChef(user.codechefprofile);
    }
    if (user.leetcodeprofile) {
        apiData.lc = await fetchLeetCode(user.leetcodeprofile);
    }
    if (user.atcoderprofile) {
        apiData.ac = await fetchAtCoder(user.atcoderprofile);
    }
    res.render("listings/myprofile.ejs", {apiData });
  }
  else{
    res.redirect("/login");
  }
});

app.listen(port, () => {
  console.log(`app is listening to port ${port}`);
});
