require("dotenv").config();
const { spawn } = require('child_process');
const fetch = require("node-fetch")
const fs = require('fs');
const socketAuth = require('socketio-auth');
const jwt = require('jsonwebtoken');
const mongodb = require('mongodb');

const { connection: dbConnection } = require("./db/utils")

const socketIo = require('socket.io');

const cert =  process.env.PUBLIC_KEY || fs.readFileSync('public.pem');


function create(server){
    const io = socketIo(server);

    io.origins('*:*');
    
    const audience = process.env.AUTH0_AUDIENCE;
    const issuer = process.env.AUTH0_ISSUER;
    socketAuth(io, {
      authenticate: (socket, data, callback) => {
        jwt.verify(data.token, cert, { audience, issuer }, (err, decoded) => {
          if (err) {
            console.log(err)
            callback(err)
          }
          callback(null, decoded);
        })
      }
    })
    
    
    io.on('connection', (socket) => {
    
      console.log("server : I have connection")
    
    
      const args = ['-i', 'pipe:0', '-b:a', '192k', '-c:a', 'libmp3lame', '-f', 'mp3', 'pipe:1']
    
      const ffmpeg_process = spawn('ffmpeg', args);
    
      ffmpeg_process.on('close', (code, signal) => {
        console.log("FFmpeg child process closed, code" + code + ", signal" + signal);
        //socket.disconnect();//.terminate();
      })

    
      ffmpeg_process.on('error', e => {
        console.log("FFmpeg  stdin error", e);
        socket.emit("recording_error")
      })
    
      //FFmpeg output messages from stderr. 
      ffmpeg_process.stderr.on('data', data => {
        console.log('FFmpeg stderr', data.toString());
      })
    
      socket.on('record_chunk', data => {
        console.log('c...')
        ffmpeg_process.stdin.write(data);
      })
    
      socket.on('disconnect', e => {
        ffmpeg_process.kill('SIGINT')
        console.log("socet closed && prcoess  SIGNINT");
      })

      socket.on('record_stop', e => {
        ffmpeg_process.kill('SIGINT');
      })
    
      socket.on('record_details', ({ recId, recName }) => {
        let fileSize = 0
        dbConnection.then(db => {
          let bucket = new mongodb.GridFSBucket(db,
            { bucketName: 'dj-trucks-records-files' }
          )
          const uploadStraem = bucket.openUploadStreamWithId(recId, recName);
          ffmpeg_process.stdout.on('data', chunk => {
              fileSize += chunk.length;
          })
          ffmpeg_process.stdout.pipe(uploadStraem)
            .on('error', (err) => {
              console.log(err);
              socket.emit("recording_error")
              socket.disconnect();
            })
            .on('finish', () => {
              console.log('succes upload track to database. file size: ' + fileSize);

              db.collection("records_metadata").insertOne({id: recId, name : recName, size: fileSize});

              socket.emit('recording_finished', {
                  fileSize: fileSize.toString()
              })

              socket.disconnect();
            })
    
          socket.emit('recorder_ready')
        })
      })
    
    
    })
}

module.exports = create;