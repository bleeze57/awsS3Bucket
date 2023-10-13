var Userdb = require('../model/model');
const AWS = require('aws-sdk');
const async=require('async');
const mongoose=require('mongoose');

// create and save new user
exports.create = (req,res)=>{
    // validate request
    if(!req.body){
        res.status(400).send({ message : "Content can not be emtpy!"});
        return;
    }

    // new user
   // new user
   const bucket = new Userdb({
    name:req.body.name,
    email:req.body.email,
    reqLevel:req.body.reqLevel,
    bucketName:req.body.bucketName,
    bucketRegion:req.body.bucketRegion,
    publicAccess:req.body.publicAccess,
    versioning:req.body.versioning
})

// save user in the database
bucket
    .save(bucket)
    .then(data => {
        //res.send(data)
        res.redirect('/home');
    })
    .catch(err =>{
        res.status(500).send({
            message : err.message || "Some error occurred while creating a create operation"
        });
    });


let S3 = new AWS.S3({
    region: bucket.bucketRegion,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS,
    });


    const bucketParams = {
    Bucket: bucket.bucketName
    };

async.waterfall([

    function createBucket(callback) {
        S3.createBucket(bucketParams, (err, data) => {
          if (err) {
            console.error('Error creating bucket:', err);
            callback(err);
          } else {
            console.log('Bucket created successfully:', data.Location);
            callback(null);
          }
        });
      },

    function putVersioning(callback){
        if(bucket.versioning="Enable"){
        
            const versioningParams = {
            Bucket: bucket.bucketName,
            VersioningConfiguration: {
              Status: 'Enabled'
            }
          };

         S3.putBucketVersioning(versioningParams, (err, data) => {
            if (err) {
              console.error('Error configuring bucket versioning:', err);
            } else {
              console.log('Bucket versioning turned on for bucket:',bucket.bucketName);
            }
            callback(null);
          })
        }else{
            console.log('Bucket versioning turned off for bucket:',bucket.bucketName);
            callback(null);
        }
       
    },
    
    function putPublicAccess(callback){
        if(bucket.publicAccess=="Enable"){

            const publicAccessBlockParams= {
                Bucket: bucket.bucketName,
                PublicAccessBlockConfiguration: {
                BlockPublicAcls: false,
                IgnorePublicAcls: false,
                BlockPublicPolicy: false,
                RestrictPublicBuckets: false
                }
            }

            //input: publicAccessBlockParams
            //output:turn off all options in 'public access' 
            S3.putPublicAccessBlock(publicAccessBlockParams, (err, data) => {
                if (err) {
                console.error('Error turning off block public access:', err);
                } else {
                console.log('Block public access settings turned off successfully for the bucket:',bucket.bucketName);
                }
                callback(null);
            })
        }
        else{
            console.log('Block public access turned on for bucket:',bucket.bucketName);
            callback(null);
        }
    },

    function putBucketPolicy(callback){

        var ReadAndWritePolicy = {
            "Version": "2012-10-17",
            "Statement": [
              {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action":["s3:GetObject"],
                "Resource": "arn:aws:s3:::"+bucketParams.Bucket+"/*"
              }
            ]
          }

        const bucketPolicyParams = {
            Bucket: bucketParams.Bucket,
            Policy: JSON.stringify(ReadAndWritePolicy),
          };
        
        // input: buckePolicyParams
        // output: assign 'GetBucket' policy to the bucket
        S3.putBucketPolicy(bucketPolicyParams, (err, data) => {
            if (err) {
              console.error('Error configuring bucket policy:', err);
            } else {
              console.log('Bucket policy configured successfully.');
            }
            callback(null)
          });
    }

],function(err) {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('All functions executed successfully.');
    }
  }
  
)

}

// retrieve and return all users/ retrive and return a single user
exports.find = (req, res)=>{

    if(req.query.id){
        const id = req.query.id;

        Userdb.findById(id)
            .then(data =>{
                if(!data){
                    res.status(404).send({ message : "Not found user with id "+ id})
                }else{
                    res.send(data)
                }
            })
            .catch(err =>{
                res.status(500).send({ message: "Erro retrieving user with id " + id})
            })

    }else{
        Userdb.find()
            .then(user => {
                res.send(user)
            })
            .catch(err => {
                res.status(500).send({ message : err.message || "Error Occurred while retriving user information" })
            })
    }

    
}

// Update a new idetified user by user id
exports.update = (req, res)=>{
    if(!req.body){
        return res
            .status(400)
            .send({ message : "Data to update can not be empty"})
    }

    const id = req.params.id;
    Userdb.findByIdAndUpdate(id, req.body, { useFindAndModify: false})
        .then(data => {
            if(!data){
                res.status(404).send({ message : `Cannot Update user with ${id}. Maybe user not found!`})
            }else{
                res.send(data)
            }
        })
        .catch(err =>{
            res.status(500).send({ message : "Error Update user information"})
        })
}

// Delete a user with specified user id in the request
exports.delete = (req, res)=>{
    const id = req.params.id;

    async.waterfall([
        function deleteS3Bucket (callback){
            const ObjectId = mongoose.Types.ObjectId;
            const objectId = id ;
            const mySchema = new mongoose.Schema({
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
            const MyModel = mongoose.models.userdbs || mongoose.model('userdbs', mySchema);
            
              MyModel.findOne({ _id: new ObjectId(objectId) })
                .then(document => {
                  if (document) {
                    console.log('Found document:', document);
                    const params = {
                    Bucket: document.bucketName, // Specify the bucket name
                    };
                    console.log(document.bucketName)

                    let S3 = new AWS.S3({
                      region: document.bucketRegion,
                      accessKeyId: process.env.AWS_ACCESS_KEY,
                      secretAccessKey: process.env.AWS_SECRET_ACCESS,
                      });
                      
                    S3.deleteBucket(params, (err, data) => {
                      if (err) {
                        console.error('Error deleting bucket:', err);
                      } else {
                        console.log('Bucket deleted successfully');
                      }
                    })

                  } else {
                    console.log('Document not found');
                  }callback(null)
                })
                .catch(err => {
                  console.error('Error finding document:', err);
                  
                }
                )
              },

            function(callback){
              Userdb.findByIdAndDelete(id)
              .then(data => {
                if(!data){
                    res.status(404).send({ message : `Cannot Delete with id ${id}. Maybe id is wrong`})
                }else{
                    console.log(data);
                    res.send({
                        message : "User was deleted successfully!"
                    })
                }callback(null)
    
                  })
            }
                    
    ],function(err){
      if (err) {
        console.error('Error:', err);
      } else {
        console.log('All functions executed successfully.');
      }
    }
    )
}

exports.login=(req,res)=>{
  credential={
    email:"admin@gmail.com",
    password:"admin123"
  }

  if(req.body.email==credential.email && req.body.password==credential.password){
    res.redirect('/home');
    //res.end("login successful")
  }else{
    res.end("invalid username")
}
}

