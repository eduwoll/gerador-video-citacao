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

      // Decodifica a imagem em base64 para um arquivo temporário
      const imagePath = `${tmpDir}/image.jpeg`;
      const imageData = img.replace(/^data:image\/jpeg;base64,/, ``);
      if (fs.existsSync(`${tmpDir}`)) {
        fs.rm(`${tmpDir}`, { recursive: true }, () => null);
      }
      fs.mkdirSync(`${tmpDir}`);
      fs.writeFileSync(imagePath, imageData, `base64`);

      // Une a imagem e o áudio em um vídeo usando o FFMPEG
      const videoPath = `${tmpDir}/video.mp4`;
      await promisifiedExec(
        `ffmpeg -loop 1 -i ${imagePath} -i ${audioUrl} -vf scale=720:-2 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest ${videoPath}`
      );

      // Lê o vídeo em um buffer e retorna para o cliente
      const videoBuffer = fs.readFileSync(videoPath);
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": videoBuffer.length,
      });
      res.end(videoBuffer);
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
