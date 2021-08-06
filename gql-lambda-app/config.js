const chromium = require('chrome-aws-lambda')
const puppeteer = chromium.puppeteer;

const pageURL = 'https://www.msn.com'
const agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'

async function asyncCall() {
    let browser = null
    let result = null;
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
      });
      let page = await browser.newPage();
      //await page.setUserAgent(agent);
      console.log('Navigating to page: ', pageURL)
      await page.goto(pageURL)
      result = await page.title()
      console.log(result)
      return result;
    } catch (error) {
      console.log('error')
      console.log(error)
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
  }

exports.createConfig = function() {
    return {
        typeDefs : `
            type Query {
                hello: String
            }
        `,
        resolvers: {
            Query: {
                hello: async () => {
                  let result = await asyncCall();
                  return result;
                }
            }
        }
    }
}