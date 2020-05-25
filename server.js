console.log("start");
require("dotenv").config();

const cors = require('cors')
const app = require('express')();
const http = require('http');
const record = require("./records");


const PORT = process.env.PORT || 4000;

app.use(cors());

app.use('/records', record);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const server = http.createServer(app).listen(PORT, () => {
  console.log('listening on *:4000');
});

server.timeout = 5000;

require('./recorderSocket')(server);
