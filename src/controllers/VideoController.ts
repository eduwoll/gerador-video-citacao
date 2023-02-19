import { Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import * as z from "zod";
import * as fs from "fs";

const tmpDir = "./tmp";

const promisifiedExec = promisify(exec);

const createVideoSchema = z.object({
  img: z.string().min(1),
  audioUrl: z.string().url(),
});

export class VideoController {
  async createVideo(req: Request, res: Response) {
    try {
      const { img, audioUrl } = createVideoSchema.parse(req.body);

      // Decodifica a imagem em base64 para um arquivo tempor�rio
      const imagePath = `${tmpDir}/image.png`;
      const imageData = img.replace(/^data:image\/png;base64,/, ``);
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
      fs.mkdirSync(tmpDir);
      fs.writeFileSync(imagePath, imageData, `base64`);

      // Une a imagem e o �udio em um v�deo usando o FFMPEG
      const videoPath = `${tmpDir}/video.mp4`; // Muda pra pasta do servidor que tu quiser
      await promisifiedExec(
        `"node_modules\\ffmpeg-static\\ffmpeg" -loop 1 -i ${imagePath} -i ${audioUrl} -vf scale=720:-2 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest ${videoPath}`
      );
      
      res.status(200).send();
    } catch (error) {
      console.error(error);

      if (error instanceof z.ZodError) {
        res.status(400).send({ error: error.flatten() });
        return;
      }

      const typedError = error as Error;
      res.status(400).send({ error: typedError.message });
    }
  }
}
