import { ManufacturerInterface } from "../../common/ManufacturerInterface";
import puppeteer from "puppeteer";
import fs from "fs";
import * as types from "../../common/types";

const BASE_URL = "https://www.k-dealer.com/Site/_mem_bin/DealerLogin.asp";
const ITEM_INQUIRY_URL =
  "https://www.k-dealer.com/Site/IIItemInquiry/IIItemInquiry.asp";
//This should be moved to S3 or other location...
const COOKIE_PATH = "../";
const USER_NAME = "STEVEBB";
const PASSWORD = "BBVPS62";
const SUCCESS_MESSAGE = "Kawasaki Dashboard - Process completed successfully";
const ERROR_MESSAGE = "Kawasaki Dashboard - Process failed!";
const VALIDATIN_CODE = 200;
const ERROR_CODE = 500;

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
  private validationFailed: boolean = false;
  private cookieFile: string = '';

  constructor() {
     this.cookieFile = COOKIE_PATH + this.GetCookieFileName();
  }

  public async crawl(partInfos: [types.OEMPartInfo]) {
    this.arr = partInfos;
    await this.initialize();
    const success = await this.login(USER_NAME, PASSWORD);
    if (success) {
      await this.inquiry(partInfos);
    }
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
    } catch (Error) {
      this.data = {
        code: ERROR_CODE,
        identifier: "",
        message: ERROR_MESSAGE,
      };
    }
  }

  public async login(username: string, password: string): Promise<any> {
    try {
      console.log("login this.cookieFile==>", this.cookieFile)
      if (fs.existsSync(this.cookieFile)) {
        const exCookies = fs.readFileSync(this.cookieFile, "utf8");

        if (exCookies) {
          const deserializedCookies = JSON.parse(exCookies);
          await this.page.setCookie(...deserializedCookies);
        }
        this.processData = true;
        return true;
      } else {
        return await this.reLogin(this.cookieFile, username, password);
      }
    } catch (Error) {
      this.data = {
        errorMessages: [{
          code: ERROR_CODE,
          identifier: "",
          message: ERROR_MESSAGE,
        }],
        message: SUCCESS_MESSAGE,
        items: [],
      };
      return await this.reLogin(COOKIE_PATH, username, password);
    }
  }

  public async inquiry(arr: any[]) {
    if (!this.processData) {
      return;
    }

    try {
      let start = +new Date();
      await this.page.goto(ITEM_INQUIRY_URL, { waitUntil: "domcontentloaded" });
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
        this.page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        submitButton[0].click(),
      ]);

      const responseGet: any = await this.page.evaluate((arr) => {
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

        function iterateResultRows(rows): any {
          const tmpArr: any = new Array();
          let jsonObject: any;
          let finishedRows = 0;
          try {
            for (let index: number = 0; index < rows.length; index++) {
              let tr = <HTMLTableRowElement>rows[index];
              if (tr.cells.length > 0 && tr.cells[0] !== undefined) {
                if (tr.cells[0].innerText === "Item Inquiry Results") {
                  jsonObject = {};
                  index++;
                  tr = <HTMLTableRowElement>rows[index];
                }
                if (tr.cells[0].className === "TableHeader") {
                  index++;
                  tr = <HTMLTableRowElement>rows[index];
                }
                if (tr.cells[0].className === "TableErrorMessage") {
                  index++;
                  tr = <HTMLTableRowElement>rows[index];
                }

                if (tr.cells.length >= 4) {
                  finishedRows++;
                  for (
                    let cellIndex: number = 0;
                    cellIndex < tr.cells.length;
                    cellIndex++
                  ) {
                    switch (tr.cells[cellIndex].innerText) {
                      case "Item Number:":
                        const itemNumber = tr.cells[cellIndex + 1].innerText;
                        if (itemNumber.includes("Substitute:")) {
                          const itmArr = itemNumber.split("\n");
                          jsonObject.supersededPartNumber =
                            itmArr[1].split(" ")[1];
                          jsonObject.requestedPartNumber = itmArr[0];
                        } else if (
                          itemNumber.includes("  Fits What Vehicle Models")
                        ) {
                          jsonObject.requestedPartNumber = itemNumber.replace(
                            "  Fits What Vehicle Models",
                            ""
                          );
                          jsonObject.supersededPartNumber = null;
                        } else {
                          jsonObject.requestedPartNumber = itemNumber;
                          jsonObject.supersededPartNumber = null;
                        }
                        break;
                      case "Availability:":
                        const tableFirstRows = <HTMLTableRowElement>(
                          tr.cells[cellIndex + 1].querySelector(
                            "table > tbody > tr:nth-child(1)"
                          )
                        );

                        const totalCols =
                          tableFirstRows && tableFirstRows.cells.length;
                        let bo: string;
                        let pkgQty: string;

                        const tableRows = <HTMLTableRowElement>(
                          tr.cells[cellIndex + 1].querySelector(
                            "table > tbody > tr:nth-child(2)"
                          )
                        );

                        if (totalCols >= 6) {
                          bo = tableRows && tableRows.cells[4].innerText;
                          pkgQty = tableRows && tableRows.cells[5].innerText;
                        } else {
                          bo = "";
                          pkgQty = tableRows && tableRows.cells[4].innerText;
                        }

                        // L image
                        const imgL =
                          tableRows && tableRows.cells[1].querySelector("img");
                        const imgLSrc = imgL && imgL.src;
                        const imgL_status = checkImgUrl(imgLSrc);

                        // R image
                        const imgR =
                          tableRows && tableRows.cells[2].querySelector("img");
                        const imgRSrc = imgR && imgR.src;
                        const imgR_status = checkImgUrl(imgRSrc);

                        // D image
                        const imgD =
                          tableRows && tableRows.cells[3].querySelector("img");
                        const imgDSrc = imgD && imgD.src;
                        const imgD_status = checkImgUrl(imgDSrc);

                        const availabilityJson = {
                          quantity: tableRows && tableRows.cells[0].innerText,
                          L: imgL_status,
                          R: imgR_status,
                          D: imgD_status,
                          BO: bo,
                          "Pkg Qty": pkgQty,
                        };
                        jsonObject.Availability = availabilityJson;
                        break;
                      case "Description:":
                        jsonObject.Description =
                          tr.cells[cellIndex + 1].innerText;
                        break;
                      case "Status:":
                        jsonObject.Status = tr.cells[cellIndex + 1].innerText;
                        break;
                      case "Dealer Price:":
                        jsonObject.DealerPrice =
                          tr.cells[cellIndex + 1].innerText;
                        break;
                      case "MSRP:":
                        jsonObject.MSRP = tr.cells[cellIndex + 1].innerText;
                        break;
                      case "Inventory Type:":
                        jsonObject.InventoryType =
                          tr.cells[cellIndex + 1].innerText;
                        break;
                      case "Eligible for Exchange:":
                        jsonObject.EligibleforExchange =
                          tr.cells[cellIndex + 1].innerText;
                        break;
                      case "Dimensions LxWxHxG (In):":
                        jsonObject.DimensionsLxWxHxG_In =
                          tr.cells[cellIndex + 1].innerText;
                        break;
                      case "Weight(lb)/Volume(ci):":
                        jsonObject.WeightVolume =
                          tr.cells[cellIndex + 1].innerText;
                        break;
                      case "Vehicle Use:":
                        jsonObject.VehicleUse =
                          tr.cells[cellIndex + 1].innerText;
                        break;
                      case "Applicable Years:":
                        jsonObject.ApplicableYears =
                          tr.cells[cellIndex + 1].innerText;
                        break;
                    }
                  }
                  if (jsonObject && finishedRows >= 6) {
                    tmpArr.push(jsonObject);
                    finishedRows = 0;
                    jsonObject = null;
                  }
                }
              }
            }
            return tmpArr;
          } catch (Error) {
            console.log(Error);
          }
          return null;
        }

        let validationMessages = new Array();
        let errorMessages = new Array();
        let resultArray = new Array();
        let query = document.querySelectorAll(
          "#top > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(1) > td > table:nth-child(1) > tbody > tr"
        );

        if (query) {
          // Process Error or validation messages
          const queryValidation =
            document.querySelectorAll(".TableErrorMessage");

          if (queryValidation) {
            queryValidation.forEach((element) => {
              const msg = (<HTMLTableCellElement>element).innerText;
              let identifier = "";
              arr.forEach((element) => {
                if (msg.includes(element.partNumber)) {
                  identifier = element.partNumber;
                  return;
                }
              });
              validationMessages.push({
                message: msg,
                code: 200,
                identifier: identifier,
              });
              this.validationFailed = true;
            });
            if (validationMessages.length > 0) {
              resultArray.push({ validationMessages: validationMessages });
            } else {
              resultArray.push({ validationMessages: [] });
            }
          }

          // Search functionality not working
          const queryErrorMessage = document.querySelectorAll(".ErrorMessage");
          if (queryErrorMessage) {
            queryErrorMessage.forEach((element) => {
              errorMessages.push({
                message: (<HTMLTableCellElement>element).innerText,
                code: 500,
                identifier: "",
              });
            });
            if (queryErrorMessage.length > 0) {
              resultArray.push({ errorMessages: errorMessages });
            } else {
              resultArray.push({ errorMessages: [] });
            }
          }

          //Crawl Search result
          const items = iterateResultRows(query);
          resultArray.push(items);
        }

        return resultArray;
      }, arr);

      console.log("responseGet==>", responseGet);
      this.data = {
        errorMessages: responseGet && [
          ...responseGet[1].errorMessages,
          ...responseGet[0].validationMessages,
        ],
        message: SUCCESS_MESSAGE,
        items: responseGet[2],
      };
      let Total_time = +new Date() - start;
      console.log("Total Process Time in milliseconds", Total_time);
      console.log("Process Completed Successfully");
      await this.browser.close();
    } catch (Error) {
      this.data = {
        errorMessages: [{
          code: ERROR_CODE,
          identifier: "",
          message: ERROR_MESSAGE,
        }],
        message: SUCCESS_MESSAGE,
        items: [],
      };
      await this.browser.close();
    }
  }

  public async reLogin(
    path: string,
    username: string,
    password: string
  ): Promise<any> {
    try {
      await this.page.goto(BASE_URL);

      await this.page.type('input[name="username"]', username);
      await this.page.type('input[name="userPassword"]', password);

      let signInButton = await this.page.$x('//*[@id="submit1"]');
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        signInButton[0].click(),
      ]);

      const queryErrorMessages = await this.page.evaluate(({ERROR_CODE, ERROR_MESSAGE}) => {
        const errorMessages: any = new Array();
        const queryErrorMessage = document.querySelectorAll(".LoginError");

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
      }, {ERROR_CODE, ERROR_MESSAGE});
      console.log("reLogin queryErrorMessages==>", queryErrorMessages);
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
        console.log("reLogin this.cookieFile==>", this.cookieFile)
        fs.writeFileSync(this.cookieFile, cookieJson);
        await this.inquiry(this.arr);
        return true;
      }
    } catch (Error) {
      this.data = {
        errorMessages: [{
          code: ERROR_CODE,
          identifier: "",
          message: ERROR_MESSAGE,
        }],
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
    let errorResult;
    if (jsonResponse.items && jsonResponse.items.length > 0) {
      for (let i = 0; i < jsonResponse.items.length; i++) {
        let uniqueTimeStamp = new Date();
        let uniqueID = Math.floor(Date.now() + Math.random() * 1000);
        arrayList.push({
          id: uniqueID,
          status: jsonResponse.items[i].Status,
          statusMessage: jsonResponse.items[i].Description,
          quantity: jsonResponse.items[i].Availability.Qty
            ? jsonResponse.items[i].Availability.Qty
            : 0,
          // leadTime: graphQLResponse.ApplicableYears,
          supersededPartNumber: jsonResponse.items[i].supersededPartNumber,
          requestedPartNumber: inputData.partInfos[i].partNumber,
          requestedQty: inputData.partInfos[i].requestedQty,
          requestedManufacturerType: inputData.manufacturerType.toString(),
          timeStamp: uniqueTimeStamp,
        });
      }
    } else {
      errorResult = {
        code: ERROR_CODE,
        identifier: "",
        message: ERROR_MESSAGE,
      };
    }
    return {
      result: arrayList,
      responseValidation: jsonResponse.validationFailed
        ? jsonResponse.validationMessages
        : [],
      responseError: errorResult,
    };
  }

  private GetCookieFileName(): string {
    let date_ob = new Date();

    // current date
    // adjust 0 before single digit date
    let date = ("0" + date_ob.getDate()).slice(-2);

    // current month
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    // current year
    let year = date_ob.getFullYear();

    // prints date in YYYY-MM-DD format
    return "kawasaki-" + year + month + date + ".json";
  }
}

const kawasakiDashboard = new KawasakiDashboard();
export { kawasakiDashboard };
