const mongoose=require('mongoose')

//decide the shape or how you want to list the data from mongoDB
var schema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    reqLevel:String,
    bucketName:String,
    bucketRegion:String,
    publicAccess:String,
    versioning:String

})

const Userdb=mongoose.model('userdb',schema);

//export Userdb module to be use by controller.js
module.exports = Userdb;