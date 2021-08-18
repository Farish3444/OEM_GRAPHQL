import { ManufacturerInterface } from "../../common/ManufacturerInterface";
import puppeteer from "puppeteer";
import fs from "fs";
import * as types from "../../common/types";

const BASE_URL = "https://www.polarisdealers.com/";
const ITEM_INQUIRY_URL =
    "https://home.polarisportal.com/Shared/Navigate?url=https%3A%2F%2Fwww.polarisdealers.com%2Fsecpages%2FDotNetRedirect.asp%3FRedirect%3D%2FDealerExtranet%2FPurePolaris%2FPartDetailSearch%2FDefault.aspx";
//This should be moved to S3 or other location...
const COOKIE_PATH = "../polaris_cookies.json";
const USER_NAME = "sisenhower@bikebandit.com";
const PASSWORD = "BBVPs1962!";
const DEALER_ID = "2125800";
const SUCCESS_MESSAGE = "Polaris Dashboard - Process completed successfully";
const ERROR_MESSAGE = "Polaris Dashboard - Process failed!";

export class PolarisDashboard implements ManufacturerInterface {
  public username: any;
  public password: any;
  public arr: any;
  public data: any;
  private browser: any;
  private page: any;
  private processData: boolean = false;
  public imgUrl: any;
  private validationFailed: boolean = false;

  // Need to return the JSON data back to GraphQL
  public async crawl(partInfos: [types.OEMPartInfo]) {
    await this.initialize();
    await this.login(USER_NAME, PASSWORD, DEALER_ID);
    await this.inquiry(partInfos);
    return this.data;
  }

  public async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
      });

      this.page = await this.browser.newPage();
    } catch (Error) {
      this.data = {
        error: true,
        message: Error.message,
      };
    }
  }

  // Need to revisit login approach...
  public async login(userName: string, password: string, dealerId: string) {
    await this.reLogin(COOKIE_PATH, userName, password, dealerId);
    try {
      if (fs.existsSync(COOKIE_PATH)) {
        const exCookies = fs.readFileSync(COOKIE_PATH, "utf8");
        console.log("cookie login");
        if (exCookies) {
          const deserializedCookies = JSON.parse(exCookies);
          await this.page.setCookie(...deserializedCookies);
          const cookies = await this.page.cookies();
        }
      } else {
        await this.reLogin(COOKIE_PATH, userName, password, dealerId);
      }
      this.processData = true;
    } catch (Error) {
      this.data = {
        errorMessages: [{
          code: '',
          identifier: "",
          message: ERROR_MESSAGE,
        }],
        message: SUCCESS_MESSAGE,
        items: [],
      };
      await this.reLogin(COOKIE_PATH, this.username, this.password, dealerId);
    }
  }

  public async inquiry(partInfos: any[]) {
    if (!this.processData) {
      return;
    }
    try {
      const tmpArr: any = new Array();
      let jsonObject: any;
      let start = +new Date();
      var data = [];
      for (let d = 0; d < partInfos.length; d++) {
        await this.page.goto(ITEM_INQUIRY_URL);
        // await this.page.goto("http://localhost:3000/dev/dist/js/polaris.html");
        await this.page.waitForTimeout(2000);
        await this.page.type('input[id="ctl00_cphDealerDefault_ucNavigationControl_txtItemID"]', partInfos[d].partNumber, { delay: 200 });
        let findButton = await this.page.$x('//*[@id="ctl00_cphDealerDefault_ucNavigationControl_btnFind"]');
        await Promise.all([this.page.waitForNavigation({ waitUntil: "domcontentloaded" }), findButton[0].click()]);
        await this.page.waitForTimeout(2500);
        const responseGet = await this.page.evaluate(() => {
          jsonObject = {};
          let query = document.querySelectorAll('#ctl00_cphDealerDefault_tblItemDetails > tbody > tr');
          for (let i = 0; i < query.length; i++) {
            let td_query_val = query[i].querySelectorAll('td');
            for (let j = 0; j < td_query_val.length; j++) {
              const spanNode =td_query_val[j].querySelector("span");
              let spanid = spanNode && spanNode.id
              if(spanid){
                console.log(spanid);
                console.log(td_query_val[j].innerText);
                switch (spanid) {
                  case "ctl00_cphDealerDefault_lblPartNumber":
                    jsonObject.partNumber = td_query_val[j].innerText;
                    break;
                  case "ctl00_cphDealerDefault_lblDescription":
                    if(spanNode?.style && spanNode?.style.color ==='red'){
                      jsonObject.descriptionError = td_query_val[j].innerText;
                    }
                    jsonObject.description = td_query_val[j].innerText;
                    break;
                  case "ctl00_cphDealerDefault_lblMinimumQty":
                    jsonObject.minimumQty = td_query_val[j].innerText;
                    break;
                  case "ctl00_cphDealerDefault_lblMSRP":
                    jsonObject.MSRP = td_query_val[j].innerText;
                    break;
                  case "ctl00_cphDealerDefault_lblExMSRP":
                    jsonObject.ExtMSRP = td_query_val[j].innerText;
                    break;
                  case "ctl00_cphDealerDefault_lblSubjectToMap":
                    jsonObject.subjectToMapPolicy = td_query_val[j].innerText;
                    break;
                  case "ctl00_cphDealerDefault_lblMessage":
                    break;
                  case "ctl00_cphDealerDefault_lblQtyAvailable":
                    jsonObject.qtyAvailable = td_query_val[j].innerText;
                    break;
                  case "ctl00_cphDealerDefault_lblInStock":
                    jsonObject.inStock = td_query_val[j].innerText;
                    break;
                  case "ctl00_cphDealerDefault_lblWeight":
                    jsonObject.weight = td_query_val[j].innerText;
                    break;
                  case "ctl00_cphDealerDefault_lblDimension":
                    jsonObject.dimension = td_query_val[j].innerText;
                    break;
                }
              }
            }
          }
          return jsonObject;
        });
        tmpArr.push(responseGet);
      }
      this.data = {
        errorMessages: [{
          code: '',
          identifier: "",
          message: '',
        }],
        items: tmpArr,
      };
    } catch (error) {
      console.log("inquiry Error==>", error);
      this.data = {
        errorMessages: [{
          code: '',
          identifier: "",
          message: ERROR_MESSAGE,
        }],
        message: SUCCESS_MESSAGE,
        items: [],
      };
      await this.browser.close();
    }
  }

  public async reLogin(path: string, username: string, password: string, dealerId: string) {
    try {
      await this.page.goto(BASE_URL);
      await this.page.type('input[name="F_DealerID"]', dealerId, { delay: 200 });
      await this.page.type('input[name="F_UserLogin"]', username, { delay: 200 });
      await this.page.type('input[name="F_Password"]', password, { delay: 200 });
      let signInButton = await this.page.$x('//*[@id="F_Submit"]');
      await Promise.all([this.page.waitForNavigation(), signInButton[0].click()]);
      const cookies = await this.page.cookies();
      const cookieJson = JSON.stringify(cookies);
      fs.writeFileSync(path, cookieJson);
      await this.inquiry(this.arr);
    } catch (Error) {
      this.data = {
        error: true,
        message: Error.message,
      };
    }
  }

  public static transformJSON2GraphQL(
    jsonResponse: any,
    inputData: types.QueryInput
  ): types.OEMAvailabilityResponse {
    // Leverage this method to transform dashboard json response to GraphQL response
    let arrayList = new Array();
    let errorResult;
    if (jsonResponse.items && jsonResponse.items.length > 0) {
      for (let i = 0; i < jsonResponse.items.length; i++) {
        let uniqueTimeStamp = new Date();
        let uniqueID = Math.floor(Date.now() + Math.random() * 1000);
        let message = jsonResponse.items[i].descriptionError;
        if(jsonResponse.items[i].descriptionError){
          message = jsonResponse.items[i].descriptionError;
        }
        arrayList.push({
          id: uniqueID,
          quantity:jsonResponse.items[i].qtyAvailable,
          supersededPartNumber: jsonResponse.items[i].partNumber,
          status:'',
          statusMessage:message,
          leadTime:'',
          requestedPartNumber:jsonResponse.items[i].partNumber,
          requestedQty: inputData.partInfos[i].requestedQty,
          requestedManufacturerType:inputData.manufacturerType.toString(),
          timeStamp: uniqueTimeStamp,
        });
      }
    } else {
      errorResult = {
        code: "500",
        message: "Internal Server Error",
      };
    }    
    return {
      result: arrayList,
      responseErrors: jsonResponse?.errorMessages,
    };
  }
}

const polarisDashboard = new PolarisDashboard();
export { polarisDashboard };
