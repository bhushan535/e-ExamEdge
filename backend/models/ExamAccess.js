const mongoose = require("mongoose");

const examAccessSchema = new mongoose.Schema({

examId:{
type:mongoose.Schema.Types.ObjectId,
ref:"Exam",
required:true
},

/* student enrollment store */

studentId:{
type:String,
required:true
},

accessCode:{
type:String,
required:true
},

used:{
type:Boolean,
default:false
}

},{timestamps:true});

module.exports = mongoose.model("ExamAccess",examAccessSchema);
