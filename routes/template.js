import express from 'express'

import { getFields } from '../controllers/template.js'

const router = express.Router()
router.get('/fields/:id', getFields)


export default router