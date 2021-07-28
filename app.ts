import { promises as fs } from "fs";
import * as yargs from "yargs";
import * as p from "puppeteer";

type CarInfo = Partial<{
  url: string;
  title: string;
  year: string;
  km: string;
  tax: string;
  location: string;
  price: string;
  consumption: string;
  fuelType: string;
}>;

let browser: undefined | p.Browser;

let logger = (_: any) => {
  return;
};

const getLogger = (debug: boolean) => (x: any) => {
  if (!debug) return;
  const output = JSON.stringify(x, undefined, 2);
  const t = new Date();
  const h = t.getHours().toString().padStart(2, "0");
  const m = t.getMinutes().toString().padStart(2, "0");
  const s = t.getSeconds().toString().padStart(2, "0");
  process.stdout.write(`\x1b[2m[${h}:${m}:${s}]\x1b[0m  ${output}\n`);
};

const findInNettiautoTable =
  (cells: string[]) =>
  async (label: string, lastCell = ""): Promise<string> => {
    if (!cells.length) return "";
    if (lastCell.includes(label)) return cells[0];
    return findInNettiautoTable(cells.slice(1))(label, cells[0]);
  };

const parseNettiauto = async (url: string): Promise<CarInfo> => {
  if (!browser) {
    throw "puppeteer not running!";
  }
  logger(`opening ${url}`);
  const page = await browser.newPage();
  await page.goto(url);
  try {
    await page.waitForSelector("#tmp_campaign");
    const tableCells = await Promise.all(
      (
        await page.$$("table.data_table tr td")
      ).map((c) => c.evaluate((el) => el.textContent.toString()))
    );
    const findInTable = findInNettiautoTable(tableCells);
    const title = await page.$eval("h1", (header) => header.textContent);
    const price = await page.$eval(
      ".price_sec span span span",
      (text) => text.textContent
    );
    const year = /^\d{4}/.exec(await findInTable("Vuosimalli"));
    const km = await findInTable("Mittarilukema");
    const location = await findInTable("Sijainti");
    const fuelType = /Bensiini|Diesel/.exec(await findInTable("Moottori"));
    const tax = await page.$eval(
      "#acc_section",
      (text) => /(Ajoneuvovero: )(\d{1,4})/gi.exec(text.textContent)?.[2]
    );
    const consumption = await page.$eval(
      "#acc_section",
      (text) => /(Yhdistetty: )(.+\/100km)/.exec(text.textContent)?.[2]
    );
    logger(`${url} scraped succesfully`);
    return {
      url,
      title: title?.toString(),
      year: year?.toString(),
      km: km?.toString(),
      location: location?.toString(),
      tax: tax?.toString(),
      price: price?.toString(),
      consumption: consumption?.toString(),
      fuelType: fuelType?.toString(),
    };
  } catch (e) {
    logger(`${url} failed to scrape`);
    return { url };
  }
};

const parseUrlFile = async (path: string) => {
  logger(`reading ${path}`);
  const file = await fs.readFile(path);
  const urls = file.toString();
  return urls.split("\n").filter((line) => line.length);
};

const generateCSV = (cars: CarInfo[]) => {
  const headings: { [Property in keyof CarInfo]: string } = {
    title: "",
    year: "Vuosimalli",
    km: "Mittarilukema",
    location: "Sijainti",
    price: "Hinta",
    tax: "Vero",
    consumption: "Kulutus",
    fuelType: "Polttoaine",
    url: "URL",
  };

  const rows = (Object.keys(headings) as Array<keyof typeof headings>).map(
    (key) => {
      return [headings[key], ...cars.map((car) => car[key] || "")];
    }
  );
  const csv = rows.map((row) => row.map((x) => `"${x}"`).join(",")).join("\n");
  return csv;
};

const main = async (args: string[]) => {
  const argv = await yargs(process.argv.slice(2))
    .option("d", {
      alias: ["debug"],
      boolean: true,
      default: false,
      description: "A flag to toggle debug output",
    })
    .option("f", {
      alias: ["file"],
      type: "string",
      default: "",
      description: "File to read car URLs from",
    }).argv;

  logger = getLogger(argv.d);

  const urls = argv.f.length ? await parseUrlFile(argv.f) : argv._;
  if (!urls.length) {
    throw "no URLs specified";
  }

  logger("starting puppeteer...");
  browser = await p.launch({ headless: false });
  logger("puppeteer started!");

  const cars = await Promise.all(
    urls.map((url) => parseNettiauto(url.toString()))
  );
  await browser.close();
  cars.map(logger);
  process.stdout.write(generateCSV(cars));
};

main(process.argv).catch((e) => process.stderr.write(e));
