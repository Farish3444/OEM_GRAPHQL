import { ManufacturerInterface } from "../../common/ManufacturerInterface";
import puppeteer from "puppeteer";
import fs from "fs";
import * as types from "../../common/types";

const COOKIE_PATH = "../";
const USER_NAME = "STEVEBB";
const PASSWORD = "BBVPS62";
const SUCCESS_MESSAGE = "Kawasaki Dashboard - Process completed successfully";
const ERROR_MESSAGE = "Kawasaki Dashboard - Process failed!";
const VALIDATION_CODE = 200;
const ERROR_CODE = 500;

const BASE_URL = "http://www.in.honda.com/RRAAApps/RRAAsec/asp/rraalog.asp";
const path = "../cookies.json";

export class HondaDashboard implements ManufacturerInterface {
  public username: any;
  public password: any;
  public dealrnumber: any;
  public arr: any;
  public data: any;
  private browser: any;
  private page: any;
  private processData: boolean = false;
  public imgUrl: any;
  private cookieFile: string = "";

  constructor() {
    this.cookieFile = COOKIE_PATH + "honda-cookie.json";
  }

  public async crawl(partInfos: [types.OEMPartInfo]) {
    this.arr = partInfos;
    await this.initialize();
    await this.login("STEVEB1", "BBVE1962s!", "106276");
    await this.inquiry(this.arr);
    return this.data;
  }
  public async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        args: [
          "--no-sandbox",
          "--disable-dev-shm-usage", // <-- add this one
        ],
      });

      this.page = await this.browser.newPage();
    } catch (error) {
      console.log("initialize Error===>", error);
    }
  }

  public async login(username: string, password: string, dealrnumber: string) {
    try {
      //   if (fs.existsSync(this.cookieFile)) {
      //     const exCookies = fs.readFileSync(this.cookieFile, "utf8");

      //     if (exCookies) {
      //       const deserializedCookies = JSON.parse(exCookies);
      //       await this.page.setCookie(...deserializedCookies);
      //     }
      //     this.processData = true;
      //   } else {
      await this.reLogin(username, password, dealrnumber);
      //   }
      this.processData = true;
    } catch (error) {
      console.log("login error==>", error);
      await this.reLogin(path, this.username, this.password);
    }
  }

  public async inquiry(arr: any[]) {
    if (!this.processData) {
      return;
    }

    try {
      let currentUrl = this.page.url().split("SessionID=")[1];
      let session_id = currentUrl.replace(/\{/g, "").replace(/\}/g, "");
      let menu_url = `https://www.in.honda.com/RRPAMCPE/programs/asp/remap13a.asp?AppTitle=Parts%20and%20Price%20Info&SessionId=${session_id}&MenuID=RDMAPH030500&MenuTab=3`;
      await this.page.goto(menu_url);
      await this.page.waitForTimeout(2000);
      var data = new Array();
      const selector = 'input[name="searchText"]';
      for (let d = 0; d < arr.length; d++) {
        await this.page.evaluate((selector) => {
          document.querySelector(selector).value = "";
        }, selector);
        await this.page.type('input[name="searchText"]', arr[d].partNumber, {
          delay: 100,
        });

        let submitButton = await this.page.$x('//*[@id="Submit1"]');
        await Promise.all([
          this.page.waitForNavigation(),
          submitButton[0].click(),
        ]);
        let create_data = await this.page.evaluate(() => {
          var json = {};
          let key_array = new Array();
          let val_array = new Array();
          let query = document
            ?.querySelector("#PartsInfoSort > thead > tr")
            ?.querySelectorAll("th");
          if (query) {
            for (let i = 0; i < query.length; i++) {
              let key_element = query[i].innerText;
              if (key_element) {
                key_array.push(key_element.replace(/ /g, ""));
              }
            }
          }
          let val_query = document
            ?.querySelector("#PartsInfoSort > tbody > tr")
            ?.querySelectorAll("td");
          if (val_query) {
            for (let j = 0; j < val_query.length; j++) {
              let val_element = val_query[j].innerText;
              if (j == 5) {
                val_array.push(parseInt(val_element));
              } else {
                val_array.push(val_element);
              }
            }
          }

          for (let k = 0; k < key_array.length; k++) {
            json[key_array[k]] = val_array[k];
          }
          return json;
        });
        data.push(create_data);
      }

      console.log("data====", data);
      this.data = data;
      console.log("Process Completed Successfully");
      await this.browser.close();
    } catch (error) {
      console.log("inquiry Error==>", error);

      //await this.reLogin(path, this.username, this.password);
    }
  }

  public async reLogin(
    username: string,
    password: string,
    dealrnumber: string
  ) {
    await this.page.goto(BASE_URL);

    await this.page.type('input[name="txtDlrNo"]', dealrnumber, { delay: 200 });
    await this.page.type('input[name="txtLogonID"]', username, { delay: 200 });
    await this.page.type('input[name="txtPassword"]', password, { delay: 200 });
    let signInButton = await this.page.$x('//*[@id="btnLogon"]');
    await Promise.all([this.page.waitForNavigation(), signInButton[0].click()]);
    // const cookies = await this.page.cookies();
    // const cookieJson = JSON.stringify(cookies);
    // fs.writeFileSync(this.cookieFile, cookieJson);
  }
}

const hondaDashboard = new HondaDashboard();
export { hondaDashboard };
