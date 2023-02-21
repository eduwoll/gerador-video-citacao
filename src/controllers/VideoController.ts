import { Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import moment from "moment";
import puppeteer from "puppeteer";
import ffmpeg from "ffmpeg-static";

const promisifiedExec = promisify(exec);
const today = moment().format("YYYY-MM-DD");
const targets = ["eucreio"];
const paths = targets.map((target) => ({
  image: `public/quote/targets/${target}/image`,
  video: `public/quote/targets/${target}/video`,
}));

const imgPageUrl =
  "http://old.ferramentas.eucreio.org/citacao/image.php?target=";
const audioPageUrl = "https://branham.org/pt/QuoteOfTheDay";

export class VideoController {
  createVideo = async (req: Request, res: Response) => {
    try {
      await this.createFolderStructure();
      await this.deleteExistingOutput();
      await this.image();
      await this.video();
      res.status(200).send();
    } catch (error) {
      console.error(error);
      const typedError = error as Error;
      res.status(400).send({ error: typedError.message });
    }
  };

  createFolderStructure = async () => {
    paths.forEach((path) => {
      fs.mkdirSync(path.image, { recursive: true });
      fs.mkdirSync(path.video, { recursive: true });
    });
  };

  deleteExistingOutput = async () => {
    paths.forEach((path) => {
      fs.rmSync(`${path.image}/${today}.png`, { force: true });
      fs.rmSync(`${path.video}/${today}.mp4`, { force: true });
    });
  };

  image = async () => {
    const selector = "#image";

    targets.forEach(async (target) => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.setViewport({ width: 720, height: 720, deviceScaleFactor: 1.5 });
      await page.goto(`${imgPageUrl + target}`);
      await page.waitForSelector(selector);

      const image = await page.$(selector);

      await image?.screenshot({
        path: `public/quote/targets/${target}/image/${today}.png`,
      });

      await page.close();
      await browser.close();
    });

    console.log("baixei a imagem");
  };

  video = async () => {
    const selector = "#audioplayer > audio > source:nth-of-type(2)";

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(audioPageUrl);
    await page.waitForSelector(selector);

    const audioElem = await page.$(selector);
    const audioUrl = await audioElem?.evaluate((el) => el.src);

    await page.close();
    await browser.close();

    const output = await Promise.all(
      paths.map((path) =>
        promisifiedExec(
          `${ffmpeg} -loop 1 -i ${path.image}/${today}.png -i ${audioUrl} -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest ${path.video}/${today}.mp4`
        )
      )
    );

    console.log(output);
  };
}
