import puppeteer from "puppeteer";
import { Page } from "puppeteer";
import { setTimeout } from "timers/promises";

import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const db = new Low(new JSONFile("e-commerce.json"), {});
await db.read();

const saveToDB = async (id, productData) => {
    db.data[id] = productData;
    await db.write();
};


const browser = await puppeteer.launch({ headless: false })
const page = await browser.newPage();

await page.goto("https://www.studioneat.com/", { waitUntil: "networkidle2" });
await page.waitForSelector(".product-title a");
const productLinks = await page.evaluate(() => {
    return [...document.querySelectorAll('.product-title a')].map(e => e.href);
})

console.log(productLinks);
await page.close();

/**
 * @param {Page} page
 * @param {String} selector
 * 
 */
const extractText = (page, selector) => {
    return page.evaluate((selector) => {
        return document.querySelector(selector)?.innerHTML
    }, selector)
}

for (let productLink of productLinks) {
    if (db.data[productLink]) {
        console.log("Item already Exists")
        continue;
    }
    console.log(productLink)
    const page = await browser.newPage()
    await page.goto(productLink, { waitUntil: 'networkidle2', timeout: 60000 })
    await page.waitForSelector('.ecomm-container h1')
    const title = await extractText(page, '.ecomm-container h1')
    const tagline = await extractText(page, '.product-tagline')
    const price = await extractText(page, '#productPrice')
    const description = await extractText(page, '.product-desc')

    const variants = await page.evaluate(() => {
        return [...document.querySelectorAll('.single-option-selector option')].map(e => e.value)
    })
    const variantData = [];

    for (let variant of variants) {
        await page.select('.single-option-selector', variant)
        await setTimeout(100)
        variantData.push({ variant, price: await extractText(page, "#productPrice") })
    }

    await saveToDB(productLink, { productLink, title, tagline, price, description, variantData })

    await page.close();

} 