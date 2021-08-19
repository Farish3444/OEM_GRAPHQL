import { ManufacturerInterface } from "../../common/ManufacturerInterface";
import puppeteer from "puppeteer";
import fs from "fs";
import * as types from "../../common/types";

const BASE_URL = "https://  www.yamaha-dealers.com/ymus/web/home.html";
const MENU_URL = "https://www.yamaha-dealers.com/ymus/web/home.html#parts";
const SEARCH_URL = "https://www.yamaha-dealers.com/ymus/jaxrs/partsAvailabilityRedirect/forward";
const COOKIE_PATH = "../";
const USER_NAME = "Stephen";
const PASSWORD = "23332019";
const SUCCESS_MESSAGE = "Yamaha Dashboard - Process completed successfully";
const ERROR_MESSAGE = "Yamaha Dashboard - Process failed!";
const VALIDATION_CODE = 200;
const ERROR_CODE = 500;

export class YamahaDashboard implements ManufacturerInterface {
  public username: any;
  public password: any;
  public dealrnumber: any;
  public arr: any;
  public data: any;
  private browser: any;
  private page: any;
  private processData: boolean = false;
  private cookieFile: string = "";

  constructor() {
    this.cookieFile = COOKIE_PATH + "yamaha-cookie.json";
  }

  public async crawl(partInfos: [types.OEMPartInfo]) {
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
          const checkCookies =
            deserializedCookies.filter((m) => m.name == "LtpaToken2").length > 0
              ? deserializedCookies.filter((m) => m.name == "LtpaToken2")[0]
                .expires
              : null;

          if (checkCookies == 1 || checkCookies == null) {
            await this.reLogin(this.cookieFile, username, password, dealrnumber);
          } else {
            await this.page.setCookie(...deserializedCookies);
          }
        }
        this.processData = true;
        return true;
      } else {
        return await this.reLogin(this.cookieFile, username, password, dealrnumber);
      }
    } catch (Error) {
      this.data = {
        errorMessages: [
          {
            code: ERROR_CODE,
            identifier: "",
            message: ERROR_MESSAGE,
          },
        ],
        message: SUCCESS_MESSAGE,
        items: [],
      };
      return await this.reLogin(COOKIE_PATH, username, password, dealrnumber);
    }
  }

  public async inquiry(arr: any[]) {
    if (!this.processData) {
      return;
    }
    try {
      let start = +new Date();
      await this.page.waitForTimeout(5000);

      await this.page.goto(MENU_URL, { waitUntil: "networkidle2" });

      await this.page.waitForTimeout(3000);

      let newTab = await this.browser.newPage();
      await newTab.goto(
        SEARCH_URL,
        { waitUntil: "networkidle2" }
      );

      await this.page.waitForTimeout(5000);

      const [tabOne, tabTwo, tabThree] = await this.browser.pages();

      //await this.page.waitForTimeout(2000);

      await tabThree.bringToFront();

      //await this.page.waitForTimeout(2000);

      await tabThree.waitForSelector('div[id="WD21"]');

      await tabThree.waitForTimeout(2000);

      let create_type = await tabThree.evaluate((arr) => {
        let inputId = new Array();
        for (let i = 0; i < arr.length; i++) {
          const contentTBodyTr = document
            .querySelectorAll("#WD24-contentTBody > tr");
          const item = contentTBodyTr && contentTBodyTr[i + 2];
          const itemTd = item && item.querySelectorAll("td");
          const itemVal = itemTd && itemTd[1].querySelector("table > tbody > tr > td > input");
          const item_id = itemVal && itemVal.id;

          inputId.push(item_id);
        }
        return inputId;
      }, arr);

      if (create_type.length > 0) {
        for (let i = 0; i < create_type.length; i++) {
          let getId = create_type[i];
          await tabThree.type(`input[id=${getId}]`, arr[i].partNumber, {
            delay: 200,
          });
        }
      }

      await tabThree.waitForTimeout(2000);

      let testButton = await tabThree.$x('//*[@id="WD1F"]');
      await testButton[0].click();

      await tabThree.waitForTimeout(25000);

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

        return key_array;
      });

      await tabThree.waitForTimeout(4000);

      let create_value = await tabThree.evaluate(
        (arr, create_key) => {
          let data = new Array();
          let json = {};
          let value_array = new Array();
          let query = document.querySelectorAll("#WD24-contentTBody > tr");
          
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
                    // if(!value) continue 
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
            data.push(json);
            json = {};
            value_array = [];
          }
          let validationMessages = new Array();
          let itemArray = new Array();
          let resultArray = new Array();          
          for (let k = 0; k < data.length; k++) {
            if (data[k].Status === "Invalid") {
              validationMessages.push({
                message: data[k].Description,
                code: 200,
                identifier: data[k].PartNumber,
              });
            }
            else
              itemArray.push(data[k])
          }
          if (validationMessages.length > 0) {
            resultArray.push({ validationMessages: validationMessages });
          } else {
            resultArray.push({ validationMessages: [] });
          }
          if (itemArray.length > 0) {
            resultArray.push(itemArray);
          } else {
            resultArray.push([]);
          }
          return resultArray;
        },
        arr,
        create_key
      );

      // this.data = create_value;
      this.data = {
        errorMessages: create_value && [
          // ...create_value[1].errorMessages,
          ...create_value[0].validationMessages,
        ],
        message: SUCCESS_MESSAGE,
        items: create_value[1],
      };
      await tabThree.waitForTimeout(2000);
      let Total_time = +new Date() - start;
      console.log("Total Process Time in milliseconds", Total_time);

      console.log("Process Completed Successfully");
      // await this.browser.close();
    } catch (Error) {
      console.log(Error);
      const url = this.page.url();
      if (url.includes("home.html?bolTimeout=true")) {
        fs.unlinkSync(this.cookieFile);
        return this.crawl(this.arr);
      }
      this.data = {
        errorMessages: [
          {
            code: ERROR_CODE,
            identifier: "",
            message: ERROR_MESSAGE,
          },
        ],
        message: SUCCESS_MESSAGE,
        items: [],
      };
      await this.browser.close();
    }
  }
  public async reLogin(
    path: string,
    username: string,
    password: string,
    dealrnumber: string
  ): Promise<any> {
    try {
    await this.page.goto(BASE_URL);

    // get the User Agent on the context of Puppeteer
    (await this.page.evaluate(() => navigator.userAgent));

    await this.page.waitForSelector('input[name="user"]');

    await this.page.type('input[name="accountnumber"]', dealrnumber);
    await this.page.type('input[name="user"]', username);
    await this.page.type('input[name="j_password"]', password);

    let signInButton = await this.page.$x('//*[@id="button-1036-btnWrap"]');
    await signInButton[0].click();

    await this.page.waitForTimeout(3000);

    const queryErrorMessages = await this.page.evaluate(
      ({ ERROR_CODE, ERROR_MESSAGE }) => {
        const errorMessages: any = new Array();
        const queryErrorMessage = document.querySelectorAll("#container-1035-innerCt");
        if (queryErrorMessage) {
          queryErrorMessage.forEach((element) => {
            errorMessages.push({
              message: ERROR_MESSAGE,
              code: ERROR_CODE,
              identifier: "",
            });
          });
        }
        return errorMessages;
      },
      { ERROR_CODE, ERROR_MESSAGE }
    );
    if (queryErrorMessages.length > 0) {
      this.data = {
        errorMessages: queryErrorMessages,
        message: SUCCESS_MESSAGE,
        items: [],
      };
      return false;
    } else {
      this.processData = true;
      const cookies = await this.page.cookies();
      const cookieJson = JSON.stringify(cookies);
      fs.writeFileSync(this.cookieFile, cookieJson);
      await this.inquiry(this.arr);
      return true;
    }
  }catch (Error) {
    console.log("reLogin Error==>", Error);
    this.data = {
      errorMessages: [
        {
          code: ERROR_CODE,
          identifier: "",
          message: ERROR_MESSAGE,
        },
      ],
      message: SUCCESS_MESSAGE,
      items: [],
    };
    await this.browser.close();
  }
  }

  public static transformJSON2GraphQL(
    jsonResponse: any,
    inputData: types.QueryInput
  ): types.OEMAvailabilityResponse {
    // Leverage this method to transform dashboard json response to GraphQL response
    let arrayList = new Array();
    for (let i = 0; i < jsonResponse?.items.length; i++) {
      let uniqueTimeStamp = new Date();
      let uniqueID = Math.floor(Date.now() + Math.random() * 1000);
      arrayList.push({
        id: uniqueID,
        status: jsonResponse.items[i].Status,
        statusMessage: jsonResponse.items[i].Description,
        quantity: jsonResponse.items[i].PackQty
          ? jsonResponse.items[i].PackQty
          : 0,
        supersededPartNumber:
          jsonResponse.items[i].Status == "CANCELED"
            ? jsonResponse.items[i].PartNumber
            : null,
        requestedPartNumber: inputData.partInfos[i].partNumber,
        requestedQty: inputData.partInfos[i].requestedQty,
        requestedManufacturerType: inputData.manufacturerType.toString(),
        timeStamp: uniqueTimeStamp,
      });
    }
    return {
      result: arrayList,
      responseErrors: jsonResponse?.errorMessages,
    };
  }
}
const yamahaDashboard = new YamahaDashboard();
export { yamahaDashboard };
