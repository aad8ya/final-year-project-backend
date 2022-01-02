// import { getTemplate } from './controllers/functions/getTemplates.js'

// getTemplate('wPUxzOtcnuNTSGdHgTf6')
//     .then(template => {
//         console.log(template.data())
//     }).catch(err => {
//         console.log(err)
//     })

// import { getTemplateImage } from "./controllers/template.js"
// getTemplateImage('XD6CUjjHTaOGfECaE7uY', { "Name of receiver": "Name", "date of issue": "today" }).then(template => {
//     console.log(template)
// })

import fs from 'fs'
import del from 'del'
//4EbMaLbqNvpmZES48xl5
del.sync(['./storage/fonts/**'], ['!./storage/fonts/4EbMaLbqNvpmZES48xl5'])