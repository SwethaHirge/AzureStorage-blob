const express = require('express');
const bodyParser = require('body-parser');
// const mongoose = require('mongoose');
const multer = require('multer');
const { BlockBlobClient } = require("@azure/storage-blob");

const app = express();

app.use(bodyParser.json());
app.use(multer().any());


app.post('/test-api' , async (req , res) => {
   
    const data= req.files
    const file= data[0]
    const typeOfFile = "file"

    //string/promise/array/iterable/asynciterable/buffer/typedarray/arraybuffer/object into a stream
    const getStream = await import('into-stream');
    //A tiny, secure, URL-friendly, unique string ID generator for JavaScript.
    const {nanoid} = await import('nanoid');
  
      const AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=pipliinternalportal;AccountKey=KbbDxAFwPASdsErJFQcBMmj9JgVCGFOUmvXWFthP9fYchEfoSpbsPb4QGlNZEiHQtdrlLgb8G/il+ASt+tREmw==;EndpointSuffix=core.windows.net";
      
      if (!AZURE_STORAGE_CONNECTION_STRING) {
      throw Error('Azure Storage Connection string not found');
      }
      
          const
          containerName = "partner"
        , blobName =  `${typeOfFile}/` + nanoid(14) + '-' + file.originalname
        , blobService = new BlockBlobClient(AZURE_STORAGE_CONNECTION_STRING,containerName,blobName)
        , stream = getStream.default(file.buffer)
        , streamLength = file.buffer.length
    ;
    console.log(blobName);
    await blobService.uploadStream(stream, streamLength)
    .then(
        ()=>{
         return res.send({data:blobService.url,msg:"File uploaded.."})
        }
    ).catch(
        (err)=>{
        if(err) {
            
            return res.send(err);
        }
    })
   
  
  }

);




app.listen(process.env.PORT || 3000, function() {
	console.log('Express app running on port ' + (process.env.PORT || 3000))
});