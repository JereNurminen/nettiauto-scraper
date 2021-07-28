import * as yargs from 'yargs'
import * as p from 'puppeteer'

type CarInfo = Partial<{
  url: string;
  title: string;
  make: string;
  model: string;
  year: string;
  km: string;
  tax: string;
  location: string;
  price: string;
  consumption: string;
  fuelType: string;
}>;

let browser: undefined | p.Browser

let logger = (_: any) => {
    return
}

const getLogger = (debug: boolean) => (x: any) => {
    if (!debug) return
    const output = JSON.stringify(x, undefined, 2)
    const t = new Date()
    const h = t.getHours().toString().padStart(2, '0')
    const m = t.getMinutes().toString().padStart(2, '0')
    const s = t.getSeconds().toString().padStart(2, '0')
    process.stdout.write(`\x1b[2m[${h}:${m}:${s}]\x1b[0m  ${output}\n`)
}

const findInNettiautoTable =
  (cells: string[]) =>
      async (label: string, lastCell = ''): Promise<string> => {
          if (!cells.length) return ''
          if (lastCell.includes(label)) return cells[0]
          return findInNettiautoTable(cells.slice(1))(label, cells[0])
      }

const parseNettiauto = async (url: string): Promise<CarInfo> => {
    if (!browser) {
        throw 'puppeteer not running!'
    }
    logger(`opening ${url}`)
    const page = await browser.newPage()
    await page.goto(url)
    try {
        await page.waitForSelector('#tmp_campaign')
        const tableCells = await Promise.all(
            (
                await page.$$('table.data_table tr td')
            ).map((c) => c.evaluate((el) => el.textContent.toString()))
        )
        const findInTable = findInNettiautoTable(tableCells)
        const title = await page.$eval('h1', (header) => header.textContent)
        const price = await page.$eval(
            '.price_sec span span span',
            (text) => text.textContent
        )
        const year = await findInTable('Vuosimalli')
        const km = await findInTable('Mittarilukema')
        const location = await findInTable('Sijainti')
        const fuelType = /Bensiini|Diesel/.exec(await findInTable('Moottori'))
        const tax = await page.$eval(
            '#acc_section',
            (text) => /(Ajoneuvovero: )(\d{1,4})/gi.exec(text.textContent)?.[2]
        )
        const consumption = await page.$eval(
            '#acc_section',
            (text) => /(Yhdistetty: )(.+\/100km)/.exec(text.textContent)?.[2]
        )
        logger(`${url} scraped succesfully`)
        return {
            url,
            title: title?.toString(),
            year: year?.toString(),
            km: km?.toString(),
            location: location?.toString(),
            tax: tax?.toString(),
            price: price?.toString(),
            consumption: consumption?.toString(),
            fuelType: fuelType?.toString()
        }
    } catch (e) {
        logger(`${url} failed to scrape`)
        return { url }
    }
}

const main = async (args: string[]) => {
    const argv = await yargs(process.argv.slice(2)).option('d', {
        alias: ['debug'],
        boolean: true,
        default: false,
        description: 'A flag to toggle debug output',
    }).argv

    logger = getLogger(argv.d)

    const urls = argv._
    if (!argv._.length) {
        throw 'exiting, no URLs specified'
    }

    logger('starting puppeteer...')
    browser = await p.launch({ headless: false })
    logger('puppeteer started!')

    const cars = await Promise.all(
        urls.map((url) => parseNettiauto(url.toString()))
    )
    await browser.close()
    cars.map(logger)
}

main(process.argv).catch((e) => process.stderr.write(e))
