import express from "express";
import { VideoController } from "../controllers/VideoController";

const router = express.Router();
const videoController = new VideoController();

router.post("/", videoController.createVideo);

export default router;
