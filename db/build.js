require("dotenv").config();
const mongodb = require('mongodb');

const {connection} = require("./utils");

connection.then( database => {
    let bucket = new mongodb.GridFSBucket(database, 
        { bucketName: 'dj-trucks-records-files' }
    )
  //  console.log(bucket)
}).catch(err => {
     console.log('MongoDB Error.' + JSON.stringify(err.message)) ;
     process.exit(1);
})


