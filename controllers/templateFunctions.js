import { getFirestore, collection, addDoc, getDoc, getDocs, query, where, setDoc, doc, deleteDoc } from 'firebase/firestore'
import { getStorage, getDownloadURL, uploadBytes, deleteObject, ref } from "firebase/storage";
import fs from 'fs'
import env from '../config.js'
import konva from 'konva'
import axios from 'axios'
/***
 * Get template object from firestore with given **templateId**
 */
export const getTemplate = templateId => {
    const db = getFirestore(env.firebaseApp)
    const template = doc(db, 'templates', templateId)
    console.log(`Getting template ${templateId}`)
    return getDoc(template)
}

/***
 * pass in imageItem and get the konva Image object that can be added to a layer
 */
export const getLoadedImage = (item) => {
    return new Promise((resolve, reject) => {
        if (item.storageRef) {
            console.log(item.storageRef)
            getDownloadURL(ref(getStorage(), item.storageRef))
                .then(url => {
                    konva.Image.fromURL(url, image => {
                        image.width(item.width)
                        image.height(item.height)

                        image.x(item.x)
                        image.y(item.y)
                        image.id = item.id
                        resolve(image)
                        return image
                    })
                }).catch(err => {
                    console.log(err)
                })
        } else {
            resolve(new konva.Image())
        }
    })

}

/***
 * pass in textItem and get the konva Text object that can be added to a layer
 */
export const getLoadedText = (item, textValue) => {
    return new Promise((resolve, reject) => {
        console.log(`getLoadedText()`)
        if (item.attr.itemLink) {
            let text = new konva.Text({
                x: item.x,
                y: item.y,
                text: textValue,
                fontSize: item.attr.fontSize,
                fontFamily: item.attr.fontFamily,
                fill: item.fill || item.color,
                id: item.id,
                align: 'center',

            })
            console.log("Text from getLoadedText():", text.y)
            resolve(text)
        }
        else {
            resolve(new konva.Text({
                x: item.x,
                y: item.y,
                text: textValue,
                fontSize: item.attr.fontSize,
                fontFamily: item.attr.fontFamily,
                fill: item.fill || item.color,
                id: item.id
            }))
        }
    })

}

/***
 * returns a promise that returns array of values with { path: outputLocationPath, family:family }
 */
export const getAllFontsFromTemplate = (template, pathDir) => {
    console.log('Getting fonts from templatesss')
    let promises = []
    for (let i in template.canvas.items) {
        let item = template.canvas.items[i]
        if (item.type === 'text') {
            if (item.attr.fileLink) {
                let fileLink = item.attr.fileLink
                let fontFamily = item.attr.fontFamily
                if (fs.existsSync(`${pathDir}/${fontFamily.replace(/ /g, '-')}.ttf`)) {
                    console.log(`${fontFamily} already exists`)
                    promises.push(getExistingFonts(`${pathDir}/${fontFamily.replace(/ /g, '-')}.ttf`, fontFamily))
                } else {
                    //fs.mkdirSync(pathDir, { recursive: true })
                    console.log("Pushing to promises")
                    let promise = downloadFile(fileLink, `${pathDir}/${fontFamily.replace(/ /g, '-')}.ttf`, fontFamily)
                    promises.push(promise)
                    console.log("Pushed to promises")
                }
            }
        }
    }
    console.log(`Promises: ${promises}`)
    return Promise.all(promises)
}

/***
 * returns a promise that returns value with { path: outputLocationPath, family:family }
 */
const downloadFile = (fileUrl, outputLocationPath, family) => {
    console.log(`Downloading ${fileUrl} to ${outputLocationPath}`)
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(outputLocationPath)
        axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream',
        }).then(response => {
            response.data.pipe(writer);
            let error = null;
            writer.on('error', err => {
                error = err;
                writer.close();
                reject('Error in saving font to storage')
            })
            writer.on('close', () => {
                if (!error) {
                    resolve({ path: outputLocationPath, family: family })
                    console.log("Resolved font object from downloadFile")
                }
            })
        }).catch(err => {
            console.log(err)
            reject('Error in downloading font')
        })
    })
}

const getExistingFonts = (path, family) => {
    return new Promise((resolve, r) => resolve({ path: path, family: family }))
}

const makeid = (length) => {
    let result = ''
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let charactersLength = characters.length
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength))
    }
    return result
}