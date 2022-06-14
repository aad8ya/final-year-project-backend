//get template from firestore
//Before creating konva stage, set all fonts to canvas
//get all items from firestore
//load font links from items
//load images from item's images
//push to layer
//set stage size from base-image
//set stage position
//generate image from stage
// save image to firebase storage
// save image data to firestore
// delete local stored images
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import {
  getStorage,
  getDownloadURL,
  uploadBytes,
  deleteObject,
  ref,
} from "firebase/storage";
import {
  getTemplate,
  getAllFontsFromTemplate,
  getLoadedImage,
  getLoadedText,
} from "./templateFunctions.js";
import canvas from "canvas";
import konva from "konva";
import fs from "fs";
import del from "del";
import {
  Client,
  PrivateKey,
  AccountId,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  FileAppendTransaction,
  FileContentsQuery,
} from "@hashgraph/sdk";
import { PublicKey } from "@hashgraph/cryptography";
import dotenv from "dotenv";
import { FileCreateTransaction } from "@hashgraph/sdk";
import { splitSync } from "node-split";
import { request } from "http";

// Gets the template, substitutes field values with data and writes an image to the filesystem buffer.
export const getTemplateImage = (templateId, fields) => {
  return new Promise((resolve, reject) => {
    let fontDir = "";
    let template = { canvas: { items: [] } };
    let buffer_ = "";
    //let randomId = makeid(20)
    let pathDir = `./storage/fonts/`;
    getTemplate(templateId)
      .then((temp) => {
        template = temp.data();
        console.log(Object.keys(template));
        return getAllFontsFromTemplate(template, pathDir);
      })
      .then((fontsObj) => {
        console.log(fontsObj);
        console.log("fonts loaded to storage");
        fontsObj.forEach((obj) => {
          fontDir = obj.folder;
          canvas.registerFont(obj.path, { family: obj.family });
        });
        let promises = [];
        template.canvas.items.map((item) => {
          console.log(item.type);
          if (item.type === "text") {
            if (item.isConstant) promises.push(getLoadedText(item, item.value));
            else promises.push(getLoadedText(item, fields[item.value]));
          }
          if (item.type === "image" || item.type === "base-image") {
            promises.push(getLoadedImage(item));
          }
        });
        return Promise.all(promises);
      })
      .then((items) => {
        let stage = new konva.Stage();
        let layer = new konva.Layer();
        stage.x(0);
        stage.y(0);
        stage.height(
          template.canvas.items.find((item) => item.type === "base-image")
            .height / 10
        );
        stage.width(
          template.canvas.items.find((item) => item.type === "base-image")
            .width / 10
        );
        stage.scaleX(0.1);
        stage.scaleY(0.1);
        stage.add(layer);
        items.forEach((item) => layer.add(item));
        stage.add(layer);
        let img = stage.toDataURL({ pixelRatio: 2, mimeType: "image/jpeg" });
        console.log("Items loaded into Konva layer by toDataURL()");
        var data = img.replace(/^data:image\/\w+;base64,/, "");
        var buffer = Buffer.from(data, "base64");
        buffer_ = buffer;
        console.log(`pathDir: ${pathDir}`);
        stage = null;
        canvas.r;
        // try {
        //     //deleteDir('./storage/fonts')
        //     console.log(`!${pathDir}`)
        //     del.sync([`./storage/fonts/**`][`!${pathDir}`])
        // } catch (e) {
        //     console.log('e')
        // }
        resolve(buffer);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Read the generated certificate from the filesystem buffer and write it as a .jpg image, and upload to firebase storage.
export const createCertificate = (req, res) => {
  let templateId = req.body.templateId;
  let fields = req.body.fields;
  let certificateName = `${req.body.receiverName}_${makeid(24)}.jpg`;
  let certificateRef = `/certificates/${certificateName}`;
  getTemplateImage(templateId, fields)
    .then((buffer) => {
      console.log("Buffer created");
      fs.writeFileSync(`./storage/${certificateName}.jpg`, buffer);
      let file = fs.readFileSync(`./storage/${certificateName}.jpg`);
      console.log("100% Completed");
      return uploadBytes(ref(getStorage(), certificateRef), file);
    })
    .then((res) => {
      console.log("File uploaded");
      let db = getFirestore();
      return addDoc(collection(db, "certificates"), {
        uid: req.body.uid,
        name: certificateName,
        isShareable: req.body.isShareable,
        fields,
        templateId,
        createdAt: new Date(),
        receiverEmail: req.body.receiverEmail,
        receiverName: req.body.receiverName,
      });
    })
    .then((docRef) => {
      //   console.log("Metadata added to firestore");
      console.log(certificateName);
      fs.unlinkSync(`./storage/${certificateName}.jpg`);
      res.send(certificateRef);
    })
    .catch((err) => {
      res.send(err);
    });
};

// Return fields available in a template
export const getFields = (req, res) => {
  getTemplateFields(req.params.id)
    .then((fields) => {
      res.send(fields);
    })
    .catch((err) => {
      res.send(err);
    });
};

export const getTemplateFields = (templateId) => {
  return new Promise((resolve, reject) => {
    getTemplate(templateId)
      .then((template) => {
        let data = template.data();
        console.log("Data:", Object.keys(data));
        let fields = [];
        data.canvas.items.forEach((item) => {
          if (!item.isConstant && item.type === "text") fields.push(item.value);
        });
        console.log(fields);
        resolve(fields);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Generate a unique fileID for use with Hedera FileService
const makeid = (length) => {
  let result = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

// Read image from buffer, and upload to Hedera Fileservice.
export const createHederaFile = async (req, res) => {
  try {
    // Init Hedera Client from SDK
    const HederaClient = Client.forTestnet();
    HederaClient.setOperator(process.env.OPERATOR_ID, process.env.OPERATOR_KEY);
    HederaClient;

    // Generate Image and write to a .jpg file from buffer
    const templateId = req.body.templateId;
    const fields = req.body.fields;
    let certificateName = `${req.body.receiverName}_${makeid(24)}.jpg`;
    let certificateRef = `/certificates/${certificateName}`;

    await getTemplateImage(templateId, fields).then(async (buffer) => {
      fs.writeFileSync(`./storage/${certificateName}.jpg`, buffer);
    });

    // Read image from file and split into 6KiB chunks, then upload to Hedera Fileservice
    const file = fs.readFileSync(`./storage/${certificateName}.jpg`);
    await uploadBytes(ref(getStorage(), certificateRef), file);
    let chunks = splitSync(file, { bytes: "1K" });

    // Create a FileCreateTransaction for first chunk
    const transaction = await new FileCreateTransaction()
      .setKeys([PublicKey.fromString(process.env.FILE_PUBLIC_KEY)])
      .setContents(chunks[0]) // First Chunk
      .setMaxTransactionFee(new Hbar(2))
      .freezeWith(HederaClient);
    const signTx = await transaction.sign(
      PrivateKey.fromString(process.env.FILE_PRIVATE_KEY)
    ); // Sign Transaction
    const submitTx = await signTx.execute(HederaClient); // Sign with Operator Private key & submit transaction to Hedera
    const receipt = await submitTx.getReceipt(HederaClient); // Get Transaction Receipt
    const fileId = receipt.fileId; // Get FileID from receipt
    console.log("FileID: " + fileId);
    console.log("Consensus State: " + receipt.status);

    // Create a FileAppendTransaction for subsequent chunks
    if (chunks.length > 1) {
      for (let i = 1; i < chunks.length; i++) {
        const transaction = await new FileAppendTransaction()
          .setFileId(fileId)
          .setContents(chunks[i])
          .setMaxTransactionFee(new Hbar(2))
          .freezeWith(HederaClient);
        const signTx = await transaction.sign(
          PrivateKey.fromString(process.env.FILE_PRIVATE_KEY)
        ); // Sign Transaction
        const submitTx = await signTx.execute(HederaClient); // Sign with Operator Private key & submit transaction to Hedera
        const receipt = await submitTx.getReceipt(HederaClient); // Get Transaction Receipt
        console.log(
          i + 1 + " / " + chunks.length + "Consensus State: " + receipt.status
        );
      }
    }

    let db = getFirestore();
    await addDoc(collection(db, "certificates"), {
      uid: req.body.uid,
      name: certificateName,
      isShareable: req.body.isShareable,
      fields,
      templateId,
      createdAt: new Date(),
      receiverEmail: req.body.receiverEmail,
      receiverName: req.body.receiverName,
      hederaFileId: fileId.toString(),
      college: req.body.college,
      batch: req.body.batch,
      degree: req.body.degree,
      department: req.body.department,
      rollNo: req.body.rollNo,
    });

    fs.unlinkSync(`./storage/${certificateName}.jpg`);
    res.send(certificateRef);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
};
