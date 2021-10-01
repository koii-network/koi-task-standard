require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ktools } = require("./helper");
const fs = require("fs");
const AWS = require("aws-sdk");
const axios = require('axios').default;
const sharp = require('sharp');
const extractFrames = require('ffmpeg-extract-frames')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const puppeteer = require('puppeteer');


AWS.config.update({
  accessKeyId: process.env.AWS_accessKeyId,
  secretAccessKey: process.env.AWS_secretAccessKey
});
const s3 = new AWS.S3();

const app = express();
const port = 3000;
const awsBucketName = "koii.live";
const gatewayURI = "arweave.net";

app.use(express.json());
app.use(cors());

if (!process.env.AWS_accessKeyId || !process.env.AWS_secretAccessKey) {
  console.error("NO AWS KEYS CONFIGURED!");
}

app.get("/", (req, res) => {
  res.send("Nothing here, go to /generatecard/id");
});

app.get("/card/:id", async (req, res) => {
  res.sendFile(__dirname + "/cards/" + req.params.id + ".html");
});

app.get("/cardImage/:id", async (req, res) => {
  res.sendFile(__dirname + "/cards/" + req.params.id + ".png");
});

app.get("/generateCard/:id", async (req, res) => {
  if (!req.params.id) {
    console.log("no id found", req.id, req);
    res.status(500).send({ success: false });
    return;
  }

  let data;
  // Error code
  try {
    data = await ktools.getNftState(req.params.id);
  } catch (e) {
    console.log("NFT not found or error getting data: ", e);
    res.status(500).send({ success: false });
    return;
  }

  console.log("trying to create card with ", data);
  data.imgSrc = `https://${gatewayURI}/${data.id}`;

  const card = await generateSocialCard(data).catch((err) => {
    console.error(err);
  });
  console.log("creating card ", req.params.id);
  res.send(card);
});

async function generateSocialCard(data) {

  // NFT preview
  return new Promise((resolve, _reject) => {
    const renderMedia = (asBg) => {
      if (data.contentType === "video/mp4")
        return `<video class="media" src="https://${gatewayURI}/${data.id}"></video>`;
      if (data.contentType === "text/html")
        return `<iframe class="media" src="https://${gatewayURI}/${data.id}"></iframe>`;
      else if (asBg)
        return `<img class="media" src='${data.imgSrc}'/></img>`
        
      else return `<img class="media" src='${data.imgSrc}'/></img>`;
    };
    const markup = `
    <main>
          <!----- NFT Media Content ---->
          <div class="nft-media">${renderMedia(true)}</div>
    </main>
        `;
    resolve(markup);
  // End NFT Preview

    // NFT thumbnail upload

    // Upload video thumbnail
    const imagePath = "./cards/" + data.id + ".png";
    if (data.contentType === "video/mp4") {
      console.log(data.contentType)
      extractFrames({
        input: 'https://' + gatewayURI + '/' + data.id,
        output: imagePath,
        offsets: [
          0000
        ]
      })
      .then (async (output) =>{
        console.log(output)
        const resize = await sharp(output)
          .resize(500, 500, {
            kernel: sharp.kernel.nearest,
            fit: 'contain',
            position: 'centre',
            background: { r: 0, g: 0, b: 0, alpha: 1 }
          })
          .toFormat('png')
          .toBuffer();
          syncImageToS3(data.id + ".png", resize)
          
      }).catch((err) => {
        console.error(err);
      })
        .then(async () => {
          console.log("The video thumbnail was created and resized successfully! " + data.id);
          const rePage = await generateRedirectPage(
            data.id,
            data.title,
            data.description
          );
          await syncHTMLToS3(data.id);
          console.log("Done syncing");
          resolve(rePage);
        })
        .catch((err) => {
          console.error(err);
      })

    // upload text/html thumbnail
    } else if (data.contentType === "text/html") {
      console.log(data.contentType)
      const imagePath = "./cards/" + data.id + ".png";
      (async () => {
        const browser = await puppeteer.launch({
          slowMo: 1000,
        });
        const page = await browser.newPage();
        await page.goto(data.imgSrc , {
          waitUntil: 'load',
        });
        await page.screenshot({ path: imagePath }).then (async (path) =>{
          const resize = await sharp(path)
            .resize(500, 500, {
              kernel: sharp.kernel.nearest,
              fit: 'contain',
              position: 'centre',
              background: { r: 0, g: 0, b: 0, alpha: 1 }
            })
            .toFormat('png')
            .toBuffer();
            syncImageToS3(data.id + ".png", resize)
            
        }).catch((err) => {
          console.error(err);
        })
          .then(async () => {
            console.log("The html thumbnail was created and resized successfully! " + data.id);
            const rePage = await generateRedirectPage(
              data.id,
              data.title,
              data.description
            );
            await syncHTMLToS3(data.id);
            console.log("Done syncing");
            resolve(rePage);
          })
          .catch((err) => {
            console.error(err);
        });
        await browser.close();
      })();


    // upload image thumbnail  
    } else {
      console.log(data.contentType)
      axios({
        method: 'get',
        url: "https://" + gatewayURI  + "/" + data.id,
        responseType: 'arraybuffer'
      })
      
        .then(async (response) => {
         const resize = await sharp(response.data)
          .resize(500, 500, {
            kernel: sharp.kernel.nearest,
            fit: 'contain',
            position: 'centre',
            background: { r: 0, g: 0, b: 0, alpha: 1 }
          })
          .toFormat('png')
          .toBuffer();
          syncImageToS3(data.id + ".png", resize)
          
      }).catch((err) => {
        console.error(err);
      })
        .then(async () => {
          console.log("The image thumbnail was created and resized successfully! " + data.id);
          const rePage = await generateRedirectPage(
            data.id,
            data.title,
            data.description
          );
          await syncHTMLToS3(data.id);
          console.log("Done syncing");
          resolve(rePage);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  });      
}
  // End upload

async function generateRedirectPage(id, title, description) {
  const markup = `
        <style>
           body: {
               width: 4800px;
               height: 3600px;
           }
        </style>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="${description}">

        <!-- Facebook Meta Tags -->
        <meta property="og:url" content="https://koi.rocks/content-detail/${id}">
        <meta property="og:type" content="website">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="https://koii.live/${id}.png">

        <!-- Twitter Meta Tags -->
        <meta name="twitter:card" content="summary_large_image">
        <meta property="twitter:domain" content="koi.rocks">
        <meta property="twitter:url" content="https://koi.rocks/content-detail/${id}">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="https://koii.live/${id}.png">

        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@200;400;600&display=swap" rel="stylesheet">        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" integrity="sha512-iBBXm8fW90+nuLcSKlbmrPcLa0OT92xO1BIsZ+ywDWZCvqsWgccV3gFoRBv0z+8dLJgyAHIhR35VZc2oM/gI1w==" crossorigin="anonymous" referrerpolicy="no-referrer" />

        <div class="ogpreview">
            <img src="https://koii.live/${id}.png">
        </div>
        
        <script>
            window.location.href = "https://koi.rocks/content-detail/${id}";
        </script>
    `;
  await writeHTMLFileToStorage(id, markup);
  return markup;
}

async function writeHTMLFileToStorage(id, markup) {
  return new Promise((resolve, reject) => {
    fs.writeFile(
      __dirname + "/cards/" + id + ".html",
      markup,
      function (err, result) {
        if (err) reject(err);
        console.log("successfully wrote html file to s3 ");
        resolve({ success: true });
      } 
    );
  });
}

async function syncHTMLToS3(id) {
  return new Promise((resolve, reject) => {
    const fileName = id + ".html";

    const fileContent = fs.readFileSync("cards/" + fileName);

    const params = {
      Bucket: awsBucketName,
      Key: fileName,
      ACL: "public-read",
      Body: fileContent,
      ContentType: "text/html"
    };
    s3.upload(params, function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data.Location);
    });
  });
}

async function syncImageToS3(fileName, fileContent) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: awsBucketName,
      Key: fileName,
      ACL: "public-read",
      Body: fileContent
    };

    s3.upload(params, function (err, data) {
      if (err) {
        reject(err);
      }
      if (!data) {
        console.log("data is null...", data);
        resolve(null);
      } else {
        console.log(`File uploaded successfully. ${data.Location} ${fileName}`);
        resolve(data.Location);
      }
    });
  });
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});