import express from 'express'
import { createCertificate } from '../controllers/template.js'
const router = express.Router()

router.post('/one', createCertificate)

export default router