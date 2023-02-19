import express from "express";
import cors from "cors";
import { VideoController } from "./controllers/VideoController";

const app = express();

app.use(cors());
app.use(express.json({limit: '50mb'}));

const videoController = new VideoController();
app.post("/", videoController.createVideo);

app.listen(3000, () => {
  console.log("Server is running on port 3000.");
});
