import express from "express";
import { createCertificate, createHederaFile } from "../controllers/template.js";
const router = express.Router();

router.post("/one", createHederaFile);

export default router;
