require("dotenv").config();
const mongodb = require('mongodb');



let db_uri  = process.env.MONGODB_URI;
let db_name = process.env.MONGODB_DB_NAME;


exports.connection = new Promise((res, rej) => {
    mongodb.MongoClient.connect(db_uri, {
        useUnifiedTopology: true,
//        useNewUrlParser: true,
    },(err, client) => {
      if (err) {
        rej(err);
      }
      if(client){
          res(client.db(db_name));
      } else {
          rej("Unknown error, client object undefined")
      }
    });
})



