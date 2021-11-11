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
const kweb = require("@_koi/sdk/web");
const ktools = new kweb.Web();
const kohaku = require("@_koi/kohaku");
const axios = require("axios");
const crypto = require("crypto");
const sharp = require('sharp');
const extractFrames = require('ffmpeg-extract-frames')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const puppeteer = require('puppeteer');
const IPFS = require('ipfs-core');
const CID = require('multiformats/cid');
const { response } = require("express");
let ipfs;
require("dotenv").config();
let contractInitialStateTx = "-cH8D20W-5Rql6sVcKWQ0j0NkjDGqWfqpWkCVNjdsn0";

const walletPath = process.env.WALLET_LOCATION;
if (!walletPath) throw new Error("WALLET_LOCATION not specified in .env");

const wallet = JSON.parse(fs.readFileSync(walletPath));

const arweave = Arweave.init({
  host: "arweave.net",
  protocol: "https",
  port: 443,
  timeout: 60000,
  logging: false
});

async function getLatestState() {
  const latestState = await Smartweave.readContract(arweave, contractInitialStateTx);
  console.log(latestState);
}
getLatestState();

// Define system constants
const FOO = "BAR";

// You can also access and store files locally
const logsInfo = {
  filename: "history.log"
};

// Define the setup block - node, external endpoints must be registered here using the namespace.express toolkit
async function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", helloWorld);
    namespace.express("get", "/generateCard/:id", generateCard);
    namespace.express("post", "/generateCardWithData", generateCardWithData);
  } 
  if (!ipfs) ipfs = await IPFS.create();
}

/**
 * Awaitable rate limit
 * @returns
 */
 function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, 10000));
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
  const { cid } = await ipfs.add('Hello world')
  console.info(cid)
  res
    .status(200)
    .type("application/json")
    .send("Hello world's cid is " + cid);
}

async function generateCard(_req, res) {
  if (!_req.params.id) {
    console.log("no id found", _req.id, req);
    res.status(500).send({ success: false });
    return;
  }

  let data;
  try {
    data = await ktools.getNftState(_req.params.id);
  } catch (e) {
    console.log("NFT not found or error getting data: ", e);
    res.status(500).send({ success: false });
    return;
  }
  gatewayURI = "arweave.net"
  console.log("trying to create card with ", data);
  data.imgSrc = `https://${gatewayURI}/${data.id}`;
  let thumb = await createThumbnail(data);
  console.log('thumbnail created', thumb);
  res.send(thumb);
}


async function generateCardWithData(_req, res) {
 
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
    const imagePath = "./src/thumbnail/" + data.id + ".png";
    console.log("conent type is " + data.contentType + "  hasImg is " + hasImg)
    // Upload video thumbnail
    if (data.contentType === "video/mp4") {
      extractFrames({
        input: 'https://' + gatewayURI + '/' + data.id,
        output: imagePath,
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
          const { cid } = await ipfs.add(resize)
          console.info(cid)
          fs.unlink(output, (err) => {
            if (err) throw err;
            console.log(output, ' was deleted');
          });
          
      }).catch((err) => {
        console.error(err);
      })
        .then(async () => {
          await update(data.id, cid)         
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
            const { cid } = await ipfs.add(resize)
            console.info(cid)
            fs.unlink(imagePath, (err) => {
              if (err) throw err;
              console.log(imagePath, ' was deleted');
            });
            
        }).catch((err) => {
          console.error(err);
        })
          .then(async () => {
          // await generateanduploadHTML(data)
        });
        await browser.close();
      })();

// upload POST image thumbnail  
  } else if (hasImg) {
    var buff = new Buffer(data.media, 'base64');
    fs.writeFileSync(imagePath, buff);
     $: resize = await sharp(buff)
        .resize(500, 500, {
          kernel: sharp.kernel.nearest,
          fit: 'contain',
          position: 'centre',
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .toFormat('png')
        .toBuffer()
        console.log(resize) 
        const { cid } = await ipfs.add(resize)
        console.info(cid)
        console.log("thumbnail" + data.id + ".png has been resize and created");
        fs.unlink(imagePath, (err) => {
          if (err) throw err;
          console.log(imagePath, ' was deleted');
        }
)
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
        console.log(resize) 
        const { cid } = await ipfs.add(resize)
        console.info(cid)

        return cid
    })
      
  }
};      

async function update() {

  const input = {
      function: "proposeUpdate",
      aid: 'gtSQKcx3Ex8eOdgZxNh0rWSNiKQCt3Xi02cGnJQ_uSM',
      cid: 'QmVhDHYYas6rnt8frPqKp6T2KjobJfCDVEYEUUH8ZgBZhF'
  }

  // const input = {
  //         function: "proposeSlash",
  //         "uid": 'oDApIgwavkt2Ks2egnIF27iMMLMaVY41raK2l07ONp0',
  //         "data": 'Soma'
  //     }

  // `interactWrite` will return the transaction ID.
  const txid = await interactWrite(
      arweave,   
      wallet,          
      contractInitialStateTx,
      input
  )
  console.log(txid)
}
update();

