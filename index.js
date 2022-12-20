const express = require('express');
const bodyParser = require('body-parser');
// const mongoose = require('mongoose');
const multer = require('multer');
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const azure = require('azure-storage');
const { BlockBlobClient, BlobServiceClient } = require("@azure/storage-blob");
const dotenv = require('dotenv'). config()


app.use(bodyParser.json());
app.use(multer().any());



// Replace with your Google Cloud Storage bucket name
const GOOGLE_BUCKET_NAME = process.env.GOOGLE_BUCKET_NAME;
const storageClient = new Storage({
  projectId: process.env.projectId,
  keyFilename: './keyfile.json'
});

// Replace with your Azure Storage account name and access key
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_ACCOUNT_ACCESS_KEY = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY;
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;


app.post('/test-api', async (req, res) => {

  const data = req.files
  const file = data[0]
  const typeOfFile = "file"

  //string/promise/array/iterable/asynciterable/buffer/typedarray/arraybuffer/object into a stream
  const getStream = await import('into-stream');
  //A tiny, secure, URL-friendly, unique string ID generator for JavaScript.
  const { nanoid } = await import('nanoid');

  const
    containerName = "partner"
    , blobName = `${typeOfFile}/` + nanoid(14) + '-' + file.originalname
    , blobService = new BlockBlobClient(AZURE_STORAGE_CONNECTION_STRING, containerName, blobName)
    , stream = getStream.default(file.buffer)
    , streamLength = file.buffer.length
    ;
  console.log(blobName);
  await blobService.uploadStream(stream, streamLength)
    .then(
      () => {
        return res.send({ data: blobService.url, msg: "File uploaded.." })
      }
    ).catch(
      (err) => {
        if (err) {

          return res.send(err);
        }
      })


}

);


// API endpoint that returns a list of files in the container
app.get('/files', async (req, res) => {

  try {
    const blobServiceClient = new BlobServiceClient(
      AZURE_STORAGE_CONNECTION_STRING

    );
    const containerClient = blobServiceClient.getContainerClient("partner");
    console.log(containerClient);
    // Get a list of all the files in the container
    const blobList = await containerClient.listBlobsFlat();

    // Return the list of files as JSON
    res.json(blobList.map(blob => blob.name));
  } catch (error) {
    // If an error occurs, send a 500 Internal Server Error response
    res.status(500).send(error);
  }
});



app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  console.log(file);


  const bucket = storageClient.bucket('learning-gcp-1');
  const blob = bucket.file(file.originalname);

  const blobStream = blob.createWriteStream();

  blobStream.on('error', (error) => {
    res.status(500).send(error);
  });

  blobStream.on('finish', () => {
    res.status(200).send('File uploaded successfully!');
  });

  blobStream.end(file.buffer);
});

app.delete('/delete/:filename', (req, res) => {
  const filename = req.params.filename;


  const bucket = storageClient.bucket('learning-gcp-1');
  const file = bucket.file(filename);

  file.delete()
    .then(() => {
      res.status(200).send(`File ${filename} deleted successfully!`);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

async function migrateFiles() {
  // Create a client for interacting with Google Cloud Storage
  const googleStorage = new Storage({
    projectId: 'learning-project-371406',
    keyFilename: './keyfile.json'
  });

  // Get a list of all the files in the bucket
  const [files] = await googleStorage.bucket(GOOGLE_BUCKET_NAME).getFiles();
  console.log(files[0]);

  // Create a client for interacting with Azure Storage
  const azureStorage = azure.createBlobService(AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_ACCESS_KEY);

  // Loop through each file and migrate it to Azure Storage
  for (const file of files) {
    console.log(`Migrating file: ${file.name}`);

    // Download the file from Google Cloud Storage
    const fileData = await file.download();

    // Upload the file to Azure Storage
    await azureStorage.createBlockBlobFromText('partner', file.name, fileData[0], (error) => {
      if (error) {
        console.error(`Error uploading file to Azure Storage: ${error}`);
      } else {
        console.log(`Successfully uploaded file to Azure Storage: ${file.name}`);
      }
    });
  }
}


app.get('/migrate', async (req, res) => {
  try {
    await migrateFiles();
    res.send('Successfully migrated files');
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

app.listen(process.env.PORT || 5000, function () {
  console.log('Express app running on port ' + (process.env.PORT || 5000))
});
