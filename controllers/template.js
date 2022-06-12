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

export const createCertificate = (req, res) => {
  let templateId = req.body.templateId;
  let fields = req.body.fields;
  let certificateName = `${req.body.receiverName}_${makeid(24)}.jpg`;
  let certificateRef = `${req.body.uid}/certificates/${certificateName}`;
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
export const createCertificates = async (req, res) => {
  const myAccountId = process.env.MY_ACCOUNT_ID;
  const myPrivateKey = process.env.MY_PRIVATE_KEY;

  if (myAccountId == null || myPrivateKey == null) {
    throw new Error(
      "Environment variables myAccountId and myPrivateKey must be present"
    );
  }
  const client = await Client.forTestnet().setOperator(
    AccountId.fromString(myAccountId),
    PrivateKey.fromString(myPrivateKey)
  );
  let templateId = req.body.templateId;
  let fields = req.body.fields;
  let certificateName = `${req.body.receiverName}_${makeid(24)}.jpg`;
  let certificateRef = `${req.body.uid}/certificates/${certificateName}`;
  getTemplateImage(templateId, fields)
    .then(async (buffer) => {
      console.log("Buffer created");
      fs.writeFileSync(`./storage/${certificateName}.jpg`, buffer);
      let file = fs.readFileSync(`./storage/${certificateName}.jpg`);

      const n = Buffer.byteLength(file);
      console.log("n" + n);
      let fileid = null;
      for (let i = 0; i < n; i += 1024) {
        console.log("if " + i);
        if (i === 0) {
          var by = [];
          var len = 0;
          if (n - i - 1 > 1024) {
            len = 1024;
          } else {
            len = n - i;
          }
          var by = file.slice(i, i + len);
          const transaction = await new FileCreateTransaction()
            .setKeys([PublicKey.fromString(process.env.filepublickey)]) //A different key then the client operator key
            .setContents(by)
            .setMaxTransactionFee(new Hbar(2))
            .freezeWith(client);
          console.log("receipt");
          console.log(receipt);
          const signTx = transaction.sign(
            PrivateKey.fromString(process.env.fileprivatekey)
          );
          const submitTx = await signTx.execute(client);
          const receipt = await submitTx.getReceipt(client);
          fileid = receipt.fileId;
        } else {
          var by = [];
          if (n - i - 1 > 1024) {
            var len = 1024;
          } else {
            var len = n - i;
          }
          var by = file.slice(i, i + len);
          const receipt = new FileAppendTransaction()
            .setFileId(fileid)
            .setContents(by)
            .setMaxTransactionFee(new Hbar(2))
            .freezeWith(client)
            .then((transaction) => {
              const signTx = transaction.sign(
                PrivateKey.fromString(process.env.fileprivatekey)
              );
              return signTx;
            })
            .then((signTx) => {
              const txResponse = signTx.execute(client);
              return txResponse;
            })
            .then((txResponse) => {
              const receipt = txResponse.getReceipt(client);
              return receipt;
            });

          const transactionStatus = receipt.status;

          console.log("Consensus State: " + transactionStatus);
        }
      }
      res.send(JSON.stringify(receipt));
    })
    .then((res) => {
      console.log("File uploaded to HederaFS");
      let db = getFirestore();
      return addDoc(collection(db, "certificates"), {
        uid: req.body.uid,
        name: certificateName,
        fields,
        templateId,
        createdAt: new Date(),
        receiverEmail: req.body.receiverEmail,
        receiverName: req.body.receiverName,
      });
    })
    .then((docRef) => {
      fs.unlinkSync(`./storage/${certificateName}.jpg`);
      res.send(certificateRef);
    })
    .catch((err) => {
      res.send(err);
    });
};
