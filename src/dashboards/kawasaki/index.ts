import { ManufacturerInterface } from "../../common/ManufacturerInterface";
import puppeteer from "puppeteer";
import fs from "fs";
import * as types from "../../common/types";

const BASE_URL = "https://www.k-dealer.com/Site/_mem_bin/DealerLogin.asp";
const MENU_URL = "https://www.k-dealer.com/site/Home/menu_partsaccessories.asp";
const ITEM_INQUIRY_URL =
  "https://www.k-dealer.com/Site/IIItemInquiry/IIItemInquiry.asp";
//This should be moved to S3 or other location...
const COOKIE_PATH = "../kawasaki_cookies.json";
const USER_NAME = "STEVEBB";
const PASSWORD = "BBVPS62";
const SUCCESS_MESSAGE = "Kawasaki Dashboard - Process completed successfully";
const ERROR_MESSAGE = "Kawasaki Dashboard - Process failed!";

export class KawasakiDashboard implements ManufacturerInterface {
  public username: any;
  public password: any;
  public arr: any;
  public data: any;
  private browser: any;
  private page: any;
  private context: any;
  private processData: boolean = false;
  public imgUrl: any;

  // Need to return the JSON data back to GraphQL
  public async crawl(partInfos: [types.OEMPartInfo]) {
    await this.initialize();
    await this.login(USER_NAME, PASSWORD);
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

  // Need to revisit login approach...
  public async login(userName: string, password: string) {
    await this.reLogin(COOKIE_PATH, userName, password);
    try {
      if (fs.existsSync(COOKIE_PATH)) {
        const exCookies = fs.readFileSync(COOKIE_PATH, "utf8");

        if (exCookies) {
          const deserializedCookies = JSON.parse(exCookies);
          await this.page.setCookie(...deserializedCookies);
          const cookies = await this.page.cookies();
        }
      } else {
        await this.reLogin(COOKIE_PATH, userName, password);
      }
      this.processData = true;
    } catch (error) {
      console.log("login error==>", error);
      await this.reLogin(COOKIE_PATH, this.username, this.password);
    }
  }

  public async inquiry(arr: any[]) {
    if (!this.processData) {
      return;
    }
    try {
      let start = +new Date();
      await this.page.goto(ITEM_INQUIRY_URL, { waitUntil: "networkidle2" });
      await this.page.waitForTimeout(1000);
      for (let i = 0; i < arr.length; i++) {
        const no = i + 1;
        const element = "SearchItemNbr_" + no;
        const qty_element = "SearchItemQty_" + no;
        await this.page.type(`input[id=${element}]`, arr[i].partNumber, {
          delay: 50,
        });
        await this.page.$eval(
          `input[id=${qty_element}]`,
          (el, qty) => {
            el.value = qty;
          },
          arr[i].requestedQty
        );
      }
      let submitButton = await this.page.$x('//*[@id="btnSubmit"]');
      await Promise.all([
        this.page.waitForNavigation(),
        submitButton[0].click(),
      ]);
      let responseGet: [string] = await this.page.evaluate(() => {
        function checkImgUrl(imgUrls) {
          const imgName = [
            "diamond-green-1.gif",
            "square-red-1.gif",
            "triangle-yellow-1.gif",
            "diamond-blue-1.gif",
          ];
          const status = ["All", "None", "Partial", "Packages built to order"];
          var statusName = "";
          for (let i = 0; i < imgName.length; i++) {
            const check_url = imgUrls.includes(imgName[i]);
            if (check_url == true) {
              statusName = status[i];
              break;
            }
          }
          return statusName;
        }
        let count = 0;
        let keyArray = new Array();
        let answerArray = new Array();
        let resultArray = new Array();
        let json = {};
        let query = document.querySelectorAll(
          "#top > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(1) > td > table:nth-child(1) > tbody > tr"
        );
        if (query) {
          if (query.length > 0) {
            for (let i = 0; i < query.length; i++) {
              var cells = query[i].querySelectorAll("td.TableDataDark");
              if (cells.length > 0) {
                let key1 = (<HTMLTableCellElement>cells[0]).innerText
                  .replace(":", "")
                  .replace(/ /g, "");
                let key2 = (<HTMLTableCellElement>cells[1]).innerText
                  .replace(":", "")
                  .replace(/ /g, "");
                keyArray.push(key1);
                keyArray.push(key2);
                var lightCells = query[i].querySelectorAll("td.TableDataLight");
                let val1 = (<HTMLTableCellElement>lightCells[0]).innerText
                  .replace(/\r?\n|\r/g, "  ")
                  .replace(/\r?\t|\r/g, "  ");
                console.log("val1==>", val1);
                if (val1.includes("Substitute:")) {
                  const itmArr = val1.split(" ");
                  console.log("itmArr==>", itmArr);
                  answerArray.push(itmArr[3]);
                } else if (val1.includes("  Fits What Vehicle Models")) {
                  answerArray.push(
                    val1.replace("  Fits What Vehicle Models", "")
                  );
                } else {
                  answerArray.push(val1);
                }
                if (i % 10 == 6 && lightCells.length > 0) {
                  let minJson = {};
                  let minKey = new Array();
                  let minVal = new Array();
                  if (lightCells[1] !== null) {
                    const tableBody = (<HTMLTableCellElement>(
                      lightCells[1]
                    )).querySelector("table > tbody");
                    const tableRow =
                      tableBody && tableBody.querySelectorAll("tr")[0];
                    const tableCol =
                      tableRow && tableRow.querySelectorAll("td");
                    if (tableCol !== null) {
                      for (let i = 0; i < tableCol.length; i++) {
                        const newKey = tableCol[i].innerText.replace(/ /g, "");
                        minKey.push(newKey);
                      }
                    }
                    const tableSecondRow =
                      tableBody && tableBody.querySelectorAll("tr")[1];
                    const tableSecondCol =
                      tableSecondRow && tableSecondRow.querySelectorAll("td");
                    if (tableSecondCol !== null) {
                      for (let i = 0; i < tableSecondCol.length; i++) {
                        if (i == 1 || i == 2 || i == 3) {
                          const img = tableSecondCol[i].querySelector("img");
                          const imgSrc = img && img.src;
                          const img_status = checkImgUrl(imgSrc);
                          minVal.push(img_status);
                        } else {
                          const newVal = tableSecondCol[i].innerText;
                          minVal.push(parseInt(newVal));
                        }
                      }
                    }
                  }
                  for (let j = 0; j < minKey.length; j++) {
                    minJson[minKey[j]] = minVal[j];
                  }
                  answerArray.push(minJson);
                  minJson = {};
                  minKey = [];
                  minVal = [];
                } else {
                  answerArray.push(
                    (<HTMLTableCellElement>lightCells[1]).innerText
                      .replace(/\r?\n|\r/g, "  ")
                      .replace(/\r?\t|\r/g, "  ")
                  );
                }
              }
            }
          }
        }
        for (let i = 0; i < keyArray.length; i++) {
          json[keyArray[i]] = answerArray[i];
          count = count + 1;
          if (count == 12) {
            count = 0;
            resultArray.push(json);
            json = {};
          }
        }
        return resultArray;
      });
      this.data = {
        error: false,
        message: SUCCESS_MESSAGE,
        items: responseGet,
      };
      let Total_time = +new Date() - start;
      console.log("Total Process Time in milliseconds", Total_time);
      console.log("Process Completed Successfully");
      await this.browser.close();
    } catch (Error) {
      this.data = {
        error: true,
        message: Error.message,
      };
      await this.browser.close();
    }
  }
  public async reLogin(path: string, username: string, password: string) {

    await this.page.goto(BASE_URL);

    await this.page.type('input[name="username"]', username);
    await this.page.type('input[name="userPassword"]', password);

    let signInButton = await this.page.$x('//*[@id="submit1"]');
    await Promise.all([this.page.waitForNavigation(), signInButton[0].click()]);

    const cookies = await this.page.cookies();
    const cookieJson = JSON.stringify(cookies);
    fs.writeFileSync(path, cookieJson);
    await this.inquiry(this.arr);
  }

  public static transformJSON2GraphQL(
    jsonResponse: any, inputData: types.QueryInput
  ): types.OEMAvailabilityResponse {    
    // Leverage this method to transform dashboard json response to GraphQL response
    const graphQLResponse = jsonResponse.items[0]  
      
    let result: [types.AvailabilityInfo] = [
      {id: graphQLResponse.ItemNumber,
      status:  graphQLResponse.Status,
      statusMessage:graphQLResponse.Description,
      // quantity: graphQLResponse.requestedQty,
      // leadTime: graphQLResponse.ApplicableYears,
      // supersedePartNumber?: graphQLResponse.,
      requestedPartNumber: inputData.partInfos[0].partNumber,
      requestedQty: inputData.partInfos[0].requestedQty,
      // requestedSkuId?: graphQLResponse.,
      requestedManufacturerType: inputData.manufacturerType.toString()}
    ]   
    return {result};
  }
}

const kawasakiDashboard = new KawasakiDashboard();
export { kawasakiDashboard };
