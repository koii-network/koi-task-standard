/*
Available APIs:

tools
require
namespace {
  redisGet()
  redisSet()
  fs()
  express()
}
*/

// Import SDK modules if you want to use them (optional)
const fs = require("fs");
const Arweave = require("arweave");
const kohaku = require("@_koi/kohaku");
const axios = require("axios");
const crypto = require("crypto");
const sharp = require('sharp');
const extractFrames = require('ffmpeg-extract-frames')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const puppeteer = require('puppeteer');

const arweave = Arweave.init({
  host: "arweave.net",
  protocol: "https",
  port: 443,
  timeout: 60000,
  logging: false
});

// Define system constants
const FOO = "BAR";

// You can also access and store files locally
const logsInfo = {
  filename: "history.log"
};

// Define the setup block - node, external endpoints must be registered here using the namespace.express toolkit
function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", helloWorld);
    namespace.express("post", "/generateCardWithData", generateCard);
  }
}

/**
 * Awaitable rate limit
 * @returns
 */
 function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, 5000));
}

// Define the execution block (this will be triggered after setup is complete)
async function execute(_init_state) {
  console.log('starting')
  let state, block;
  for (;;) {
    try {
      // await setTimeout(async () => {
      //   console.log('ss')
      // }, 5000)
      await rateLimit()
      console.log('still running')
      // [nodes] = await getRegisteredNodeList();
      // auditNodes();
    } catch (e) {
      console.error("Error", e);
      continue;
    }
  }
}

async function helloWorld(_req, res) {
  res
    .status(200)
    .type("application/json")
    .send("Hello world Soma");
}

async function generateCard(_req, res) {
  console.log("generating card from data", _req.body);
  const data = _req.body;
  data.reward = 0;
  data.attention = 0;
  gatewayURI = "arweave.net"
  data.imgSrc = `https://${gatewayURI}/${data.id}`;
  data.data.media = data.media.url.replace(/^data:image\/[a-z]+;base64,/, "");

  createThumbnail(data.data, true).then(thumb => {
    res.sendStatus(200)
    res.json(thumb)
  }).catch((err) => {
    console.error(err);
  });
}

async function createThumbnail (data, hasImg) {
    // NFT thumbnail upload
    const imagePath = "./thumbnails/" + data.id + ".png";
    console.log("conent type is " + data.contentType + "  hasImg is " + hasImg)
    // Upload video thumbnail
    if (data.contentType === "video/mp4") {
      extractFrames({
        input: 'https://' + gatewayURI + '/' + data.id,
        output: './thumbnails/' + data.id + '.jpg',
        offsets: [
          0000
        ]
      })
      .then (async (output) =>{
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
          fs.unlink(output, (err) => {
            if (err) throw err;
            console.log(output, ' was deleted');
          });
          
      }).catch((err) => {
        console.error(err);
      })
        .then(async () => {
          await generateanduploadHTML(data)         
      })

    // upload text/html thumbnail
    } else if (data.contentType === "text/html") {
      (async () => {
        const browser = await puppeteer.launch({
          slowMo: 1000,
          args: ["--no-sandbox"]
        });
        const page = await browser.newPage();
        await page.goto(data.imgSrc , {
          waitUntil: 'load',
        });
        await page.screenshot({ path: imagePath })
        .then (async (path) =>{
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
            fs.unlink(imagePath, (err) => {
              if (err) throw err;
              console.log(imagePath, ' was deleted');
            });
            
        }).catch((err) => {
          console.error(err);
        })
          .then(async () => {
          await generateanduploadHTML(data)
        });
        await browser.close();
      })();

// upload POST image thumbnail  
  } else if (hasImg) {
    var buff = new Buffer(data.media, 'base64');
    fs.writeFileSync(imagePath, buff);
     const resize = await sharp(buff)
        .resize(500, 500, {
          kernel: sharp.kernel.nearest,
          fit: 'contain',
          position: 'centre',
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .toFormat('png')
        .toBuffer();
        syncImageToS3(data.id + ".png", resize)
        
    .catch((err) => {
      console.error(err);
    })
      .then(async () => {
       await generateanduploadHTML(data)
      })
      fs.unlink(imagePath, (err) => {
        if (err) throw err;
        console.log(imagePath, ' was deleted');
      });    
  // upload image thumbnail  
  } else {
    axios({
      method: 'get',
      url: "https://" + gatewayURI  + "/" + data.id,
      responseType: 'arraybuffer'
    })
    
      .then(async (response) => {
      // console.log(response.data)
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
        await generateanduploadHTML(data)
      });
  }
};      


