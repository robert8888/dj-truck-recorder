const express = require('express');
const router = express.Router();
const mongodb = require('mongodb');
const logger = require("./logger");
const { createPartialContentHandler, ContentDoesNotExistError } = require('express-partial-content');
const { connection: dbConnection } = require("./db/utils")
const { Readable } = require('stream')

const recordFileProvider = async (req) => {

  const id = parseInt(req.params.id);
  // const mimeType = "application/octet-stream";
  const mimeType = "audio/mpeg";
  const db = await dbConnection;

  const file = await db.collection("records_metadata").findOne({ id })

  if (!file) {
    throw new ContentDoesNotExistError(`File with id doesn't exist: ${id}`);
  }

  const totalSize = file.size;// - 8160 * 32;
  console.log("total size is ", totalSize)
  const fileName = file.name;

  const bucket = new mongodb.GridFSBucket(db,
    { bucketName: 'dj-trucks-records-files' }
  )

  const getStream = (range) => {
    if (!range) {
      return bucket.openDownloadStream(id);
    } else {
      let { start, end } = range;

      return bucket.openDownloadStream(id, { start });
    }
  }

  return {
    fileName,
    totalSize,
    mimeType,
    getStream
  };
}

const handler = createPartialContentHandler(recordFileProvider, logger);

router.get("/:id", handler);


router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const db = await dbConnection;

  const bucket = new mongodb.GridFSBucket(db,
    { bucketName: 'dj-trucks-records-files' }
  )

  bucket.delete(id, (err) => {
    res.json({ status: err ? 'error' : 'success' })
  })

})

router.put("/:id", (req, res) => {

})

router.get("/download/:id/:file_name", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const fileName = (req.params.file_name || "record") + ".mp3";
    const db = await dbConnection;
    const file = await db.collection("records_metadata").findOne({ id })
    const fileSize = file.size;
    const bucket = new mongodb.GridFSBucket(db,
      { bucketName: 'dj-trucks-records-files' }
    )
    const stream = bucket.openDownloadStream(id);
    res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
    res.setHeader('Content-Length', 'audio/mpeg');
    res.setHeader('Content-type', fileSize);
    stream.pipe(res);
    //  res.pipe(stream);
  } catch (e) {
    res.status(404)
  }

})

module.exports = router;