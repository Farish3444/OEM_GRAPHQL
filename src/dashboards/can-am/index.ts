import { ManufacturerInterface } from "../../common/ManufacturerInterface";
import puppeteer from "puppeteer";
import fs from "fs";
import * as types from "../../common/types";

const COOKIE_PATH = "../";
const USER_NAME = "stevebb.isenhower";
const PASSWORD = "Sibbvps@1962";
const DEALERNUMBER = "705740";
const SUCCESS_MESSAGE = "Honda Dashboard - Process completed successfully";
const ERROR_MESSAGE = "Honda Dashboard - Process failed!";
const VALIDATION_CODE = 200;
const ERROR_CODE = 500;
const BASE_URL = "https://brp.secure.force.com/";
const ITEM_INQUIRY_URL =
  "https://www.bossweb.brp.com/Pages/Parts/PartAvailability.aspx";

export class CanAmDashboard implements ManufacturerInterface {
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
    this.cookieFile = COOKIE_PATH + "canam-cookie.json";
  }
  public async crawl(partInfos: [types.OEMPartInfo]) {
    this.arr = partInfos;
    await this.initialize();
    await this.login(USER_NAME, PASSWORD, DEALERNUMBER);
    await this.inquiry(this.arr);
    return this.data;
  }
  public async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });

      this.page = await this.browser.newPage();
    } catch (error) {
      console.log("initialize Error===>", error);
    }
  }

  public async login(username: string, password: string, dealrnumber: string) {
    try {
      if (fs.existsSync(this.cookieFile)) {
        const exCookies = fs.readFileSync(this.cookieFile, "utf8");

        if (exCookies) {
          const deserializedCookies = JSON.parse(exCookies);
          await this.page.setCookie(...deserializedCookies);
          const cookies = await this.page.cookies();
        }
      } else {
        await this.reLogin(USER_NAME, PASSWORD, DEALERNUMBER);
      }
      this.processData = true;
    } catch (error) {
      console.log("login error==>", error);

      await this.reLogin(username, password, dealrnumber);
    }
  }

  public async inquiry(arr: any[]) {
    if (!this.processData) {
      return;
    }

    try {
      var data = new Array();
      let start = +new Date();
      
      for (let d = 0; d < arr.length; d++) {
        await this.page.goto(ITEM_INQUIRY_URL, { waitUntil: "domcontentloaded" });
        // await this.page.goto("http://localhost/parts.html", {
        //   waitUntil: "domcontentloaded",
        // });
        await this.page.waitForTimeout(3000);

        await this.page.select(
          "#PlaceHolderMain_SelectProductLine",
          arr[d].productLine.toString()
        );
        //await this.page.waitForTimeout(2000);

        await this.page.type(
          'input[id="PlaceHolderMain_PartEntryZone_PartNumber_0"]',
          arr[d].partNumber, 100
        );
        await this.page.type(
          'input[id="PlaceHolderMain_PartEntryZone_RequestedQuantity_0"]',
          arr[d].requestedQty.toString(), 100
        );

        let nextButton = await this.page.$x(
          '//*[@id="CommandBar1_SubmitAction_ActionButton"]'
        );
        await nextButton[0].click();
               
        await this.page.waitForTimeout(6000);
        
        let create_data = await this.page.evaluate(({arr, d}) => {
          let key_array = new Array();
          let val_array = new Array();
          let jsonArray:any = new Array();
          const rows = document.querySelectorAll(
            "table.SectionTable > tbody > tr > td:nth-child(1) > table > tbody > tr"
          );
          let key_query = rows[0].querySelectorAll("th");
          for (let i = 0; i < key_query.length; i++) {
            const key_element = key_query[i].innerText;
            key_array.push(
              key_element.replace(/\r?\n|\r/g, "").replace(/ /g, "")
            );
          }

          let jsonObject: any;
          
          for (let i = 1; i < rows.length; i++) {
            jsonObject = {};
            const tds = rows[i].querySelectorAll("td");
            for (let j = 0; j < tds.length; j++) {
              const val_element = tds[j].innerText;
              val_array.push(
                val_element.replace(/\r?\n|\r/g, "").replace(/ /g, "")
              );
              jsonObject[key_array[j]] = val_element.replace(/\r?\n|\r/g, "").replace(/ /g, "");
            }
            jsonArray.push(jsonObject);
          }
          console.log("jsonArray==>", jsonArray);
          const result = jsonArray.filter(item => item['PartNumber'] === arr[d].partNumber.toString()  && item['Ex.'] !== '*');
          console.log("result==>", result);
          return result[0];
        }, { arr, d});
        console.log("create_data==>", create_data)
        data.push(create_data);
      }
      
      console.log("create_data====", data);
      this.data = data;
      let Total_time = +new Date() - start;
      console.log("Total Process Time in milliseconds", Total_time);
      console.log("Process Completed Successfully");
      //await this.browser.close();
    } catch (error) {
      console.log("inquiry Error==>", error);

      await this.reLogin(USER_NAME, PASSWORD, DEALERNUMBER);
    }
  }

  private async reLogin(
    username: string,
    password: string,
    dealrnumber: string
  ) {
    await this.page.goto(BASE_URL);
    await this.page.waitForTimeout(2000);
    const selector = 'input[name="j_id0:j_id5:Login1_Dealer_No"]';
    await this.page.evaluate((selector) => {
      document.querySelector(selector).value = "";
    }, selector);
    await this.page.type(
      'input[name="j_id0:j_id5:Login1_Dealer_No"]',
      dealrnumber,
      100
    );
    const selUser = 'input[name="j_id0:j_id5:Login1_UserName"]';
    await this.page.evaluate((selUser) => {
      document.querySelector(selUser).value = "";
    }, selUser);
    await this.page.type(
      'input[name="j_id0:j_id5:Login1_UserName"]',
      username,
      100
    );
    await this.page.type(
      'input[name="j_id0:j_id5:Login1_Password"]',
      password,
      100
    );

    let signInButton = await this.page.$x('//*[@id="j_id0:j_id5:j_id24"]');
    await Promise.all([this.page.waitForNavigation(), signInButton[0].click()]);

    const cookies = await this.page.cookies();
    const cookieJson = JSON.stringify(cookies);
    fs.writeFileSync(this.cookieFile, cookieJson);
    await this.inquiry(this.arr);
  }
}

const canAmDashboard = new CanAmDashboard();
export { canAmDashboard };
