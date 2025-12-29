const mongoose=require("mongoose");
const Schema=mongoose.Schema;
// const passportLocalMongoose=require("passport-local-mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;
const userSchema=new Schema({
    email:{
        type:String,
        required:true,
    },

    codeforceprofile:{
        type:String,
        default:""
    },
    codechefprofile:{
        type:String,
        default:""
    },
    leetcodeprofile:{
        type:String,
        default:""
    },
    atcoderprofile:{
        type:String,
        default:""
    },
    
});
userSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("User",userSchema);