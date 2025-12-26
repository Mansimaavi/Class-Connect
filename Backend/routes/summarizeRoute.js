import express from "express";
import { summarizePdfFromUrl } 
from "../Controllers/Pdf&FolderController/summarizeController.js";

const router = express.Router();

router.post("/summarize-url", summarizePdfFromUrl);

export default router;
