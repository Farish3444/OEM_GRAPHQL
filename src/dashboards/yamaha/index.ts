import { ManufacturerInterface } from "../../common/ManufacturerInterface";
import puppeteer from "puppeteer";
import fs from "fs";
import * as types from "../../common/types";
​
const BASE_URL = "https://www.yamaha-dealers.com/ymus/web/home.html";
const MENU_URL = "https://www.yamaha-dealers.com/ymus/web/home.html#parts";
const SEARCH_URL = "https://www.yamaha-dealers.com/ymus/jaxrs/partsAvailabilityRedirect/forward";
const COOKIE_PATH = "../yamaha_cookies.json";
​const USER_NAME = "Stephen";
const PASSWORD = "23332019";
const SUCCESS_MESSAGE = "Yamaha Dashboard - Process completed successfully";
const ERROR_MESSAGE = "Yamaha Dashboard - Process failed!";

export class YamahaDashboard implements ManufacturerInterface  {
    public username: any;
    public password: any;
    public dealrnumber: any;
    public arr: any;
    public data: any;
    private browser: any;
    private page: any;
    private processData: boolean = false;
    ​ public async crawl(partInfos: [types.OEMPartInfo]) {
        await this.initialize();
        await this.login(USER_NAME, PASSWORD, "248020");
        await this.inquiry(partInfos);
        return this.data;
    }
    public async initialize() {
        try {
          this.browser = await puppeteer.launch({
            headless: false,
          });
    ​
          this.page = await this.browser.newPage();
    ​
        } catch (error) {
          console.log("initialize Error===>", error);
        }
      }

      ​
  public async login(username: string, password: string, dealrnumber: string) {
    try {
      if (fs.existsSync(COOKIE_PATH)) {
        const exCookies = fs.readFileSync(COOKIE_PATH, "utf8");
        if (exCookies) {
          const deserializedCookies = JSON.parse(exCookies);
          const checkCookies =
            deserializedCookies.filter((m) => m.name == "LtpaToken2").length > 0
              ? deserializedCookies.filter((m) => m.name == "LtpaToken2")[0]
                  .expires
              : null;
​
          if (checkCookies == 1 || checkCookies == null) {
            await this.reLogin(COOKIE_PATH, username, password, dealrnumber);
          } else {
            await this.page.setCookie(...deserializedCookies);
          }
        }
      } else {
        await this.reLogin(COOKIE_PATH, username, password, dealrnumber);
      }
      this.processData = true;
    } catch (error) {
      console.log("login error==>", error);
    }
  }

​  public async inquiry(arr: any[]) {
    if (!this.processData) {
      return;
    }
​
    try {
      let start = +new Date();
      await this.page.waitForTimeout(5000);
​
      await this.page.goto(MENU_URL, { waitUntil: "networkidle2" });
​
      await this.page.waitForTimeout(3000);
​
      let newTab = await this.browser.newPage();
      await newTab.goto(
        SEARCH_URL,
        { waitUntil: "networkidle2" }
      );
​
      await this.page.waitForTimeout(5000);
​
      const [tabOne, tabTwo, tabThree] = await this.browser.pages();
​
      //await this.page.waitForTimeout(2000);
​
      await tabThree.bringToFront();
​
      //await this.page.waitForTimeout(2000);
​
      await tabThree.waitForSelector('div[id="WD21"]');
​
      await tabThree.waitForTimeout(2000);
​
      let create_type = await tabThree.evaluate((arr) => {
        let inputId = new Array();
        for (let i = 0; i < arr.length; i++) {
            const contentTBodyTr = document
            .querySelectorAll("#WD24-contentTBody > tr");
            const item = contentTBodyTr && contentTBodyTr[i + 2];
            const itemTd = item && item.querySelectorAll("td");
            const itemVal = itemTd && itemTd[1].querySelector("table > tbody > tr > td > input");
          const item_id = itemVal && itemVal.id;
​
          inputId.push(item_id);
        }
        return inputId;
      }, arr);
​
      if (create_type.length > 0) {
        for (let i = 0; i < create_type.length; i++) {
          let getId = create_type[i];
          await tabThree.type(`input[id=${getId}]`, arr[i].partNumber, {
            delay: 200,
          });
        }
      }
​
      await tabThree.waitForTimeout(2000);
​
      let testButton = await tabThree.$x('//*[@id="WD1F"]');
      await testButton[0].click();
​
      await tabThree.waitForTimeout(25000);
​
      let create_key = await tabThree.evaluate(() => {
        let key_array = new Array();
        let query_length = document
          .querySelectorAll("#WD24-contentTBody > tr")[1]
          .querySelectorAll("th").length;
        for (let i = 0; i < query_length; i++) {
          let query = document
            .querySelectorAll("#WD24-contentTBody > tr")[1]
            .querySelectorAll("th")[i + 1];
          if (query) {
              const span = query && query
              .querySelector("div > div > span > span");
            let key_item = span && span.innerHTML.replace(/ /g, "");
            key_array.push(key_item);
          }
        }
​
        return key_array;
      });
​
      await tabThree.waitForTimeout(4000);
​
      let create_value = await tabThree.evaluate(
        (arr, create_key) => {
          let data = new Array();
          let json = {};
          let value_array = new Array();
          let query = document.querySelectorAll("#WD24-contentTBody > tr");
​
          for (let i = 0; i < arr.length; i++) {
            let get_query = query[i + 2];
            if (get_query) {
              let select_query = get_query.querySelectorAll("td");
              for (let j = 0; j < select_query.length; j++) {
                let get_query_value = select_query[j + 2];
                if (get_query_value) {
                  if (j == 0) {
                      const input = get_query_value.querySelector("input");
                    let value = input && input.value;
                    value_array.push(value);
                  } else {
                      const span = get_query_value.querySelector("span");
                    let value = span && span.innerText;
                    value_array.push(value);
                  }
                }
              }
            }
            for (let k = 0; k < create_key.length; k++) {
              json[create_key[k]] = value_array[k];
            }
​
            data.push(json);
            json = {};
            value_array = [];
          }
​
          return data;
        },
        arr,
        create_key
      );
​
      this.data = create_value;
      console.log("Data======", create_value);
      await tabThree.waitForTimeout(2000);
      let Total_time = +new Date() - start;
      console.log("Total Process Time in milliseconds", Total_time);
​
      console.log("Process Completed Successfully");
      await this.browser.close();
    } catch (error) {
      console.log("inquiry Error==>", error);
    }
  }
  public async reLogin(
    path: string,
    username: string,
    password: string,
    dealrnumber: string
  ) {
    console.log("reLogin call");
    
    await this.page.goto(BASE_URL);
​
    // get the User Agent on the context of Puppeteer
    +(await this.page.evaluate(() => navigator.userAgent));
​
    await this.page.waitForSelector('input[name="user"]');
​
    await this.page.type('input[name="accountnumber"]', dealrnumber);
    await this.page.type('input[name="user"]', username);
    await this.page.type('input[name="j_password"]', password);
​
    let signInButton = await this.page.$x('//*[@id="button-1036-btnWrap"]');
    await signInButton[0].click();
​
    await this.page.waitForTimeout(3000);
​
    const cookies = await this.page.cookies();
​
    const cookieJson = JSON.stringify(cookies);
    fs.writeFileSync(path, cookieJson);
    await this.inquiry(this.arr);
  }

  public static transformJSON2GraphQL(
    jsonResponse: any,
    inputData: types.QueryInput
  ): types.OEMAvailabilityResponse {
    // Leverage this method to transform dashboard json response to GraphQL response
    let arrayList = new Array();
    let errorResult;    
    if (jsonResponse && jsonResponse.length > 0) {
      for (let i = 0; i < jsonResponse.length; i++) {
        let uniqueTimeStamp = new Date();
        let uniqueID = Math.floor(Date.now() + Math.random() * 1000);
        arrayList.push({
          id: uniqueID,
          status: jsonResponse[i].Status,
          statusMessage: jsonResponse[i].Description,
          quantity: jsonResponse[i].PackQty
            ? jsonResponse[i].PackQty
            : 0,
          supersededPartNumber:
            jsonResponse[i].Status == "CANCELED"
              ? jsonResponse[i].PartNumber
              : null,
          requestedPartNumber: inputData.partInfos[i].partNumber,
          requestedQty: inputData.partInfos[i].requestedQty,
          requestedManufacturerType: inputData.manufacturerType.toString(),
          timeStamp: uniqueTimeStamp,
        });
      }
    } else {
      errorResult = {
        code: "100",
        message: "JSON item is empty or null",
      };
    }
    return {
      result: arrayList,
      responseErrors: errorResult,
    };
  }
}
const yamahaDashboard = new YamahaDashboard();
export { yamahaDashboard };
