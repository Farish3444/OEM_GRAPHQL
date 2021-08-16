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
  private processData: boolean = false;
  public imgUrl: any;
  private validationFailed: boolean = false;

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
    } catch (Error) {
      this.data = {
        error: true,
        message: Error.message,
      };
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
    } catch (Error) {
      this.data = {
        error: true,
        message: Error.message,
      };
      await this.reLogin(COOKIE_PATH, this.username, this.password);
    }
  }

  public async inquiry(partInfos: types.OEMPartInfo[]) {
    if (!this.processData) {
      return;
    }

    try {
      let start = +new Date();

      await this.page.goto(ITEM_INQUIRY_URL, { waitUntil: "domcontentloaded" });
      await this.page.waitForTimeout(1000);

      for (let i = 0; i < partInfos.length; i++) {
        const no = i + 1;
        const element = "SearchItemNbr_" + no;
        const qty_element = "SearchItemQty_" + no;
        await this.page.type(`input[id=${element}]`, partInfos[i].partNumber, {
          delay: 50,
        });
        await this.page.$eval(
          `input[id=${qty_element}]`,
          (el, qty) => {
            el.value = qty;
          },
          partInfos[i].requestedQty
        );
      }

      let submitButton = await this.page.$x('//*[@id="btnSubmit"]');
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        submitButton[0].click(),
      ]);

      const responseGet: any = await this.page.evaluate(() => {
        function checkImgUrl(imgUrls) {
          console.log("imgUrls==>", imgUrls);
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

        function iterateResultRows(rows) : any {
          console.log("rows==>", rows);
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
                          jsonObject.supersedePartNumber =
                            itmArr[1].split(" ")[1];
                          jsonObject.requestedPartNumber = itmArr[0];
                        } else if (
                          itemNumber.includes("  Fits What Vehicle Models")
                        ) {
                          jsonObject.requestedPartNumber = itemNumber.replace(
                            "  Fits What Vehicle Models",
                            ""
                          );
                          jsonObject.supersedePartNumber = null;
                        } else {
                          jsonObject.requestedPartNumber = itemNumber;
                          jsonObject.requestedPartNumber = null;
                        }
                        break;
                      case "Availability:":

                        const tableFirstRows = <HTMLTableRowElement>(
                          tr.cells[cellIndex + 1].querySelector(
                            "table > tbody > tr:nth-child(1)"
                          )
                        );

                        const totalCols = tableFirstRows && tableFirstRows.cells.length;
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
                          bo = '';
                          pkgQty = tableRows && tableRows.cells[4].innerText;
                        }

                        console.log("tableRows==>", tableRows);

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
                          "Pkg Qty": pkgQty
                        };
                        jsonObject.Availability = availabilityJson;

                        //console.log("Availability==>", tableRows);
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
          console.log("tmpArr==>", tmpArr);
          return null;
        }

        let count = 0;
        let validationMessages = new Array();
        let errorMessages = new Array();
        let keyArray = new Array();
        let answerArray = new Array();
        let resultArray = new Array();
        let json = {};
        let query = document.querySelectorAll(
          "#top > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(1) > td > table:nth-child(1) > tbody > tr"
        );

        if (query) {
          if (query.length > 0) {   
            
          }
          // Process Error or validation messages
          const queryValidation =
            document.querySelectorAll(".TableErrorMessage");

          if (queryValidation) {
            queryValidation.forEach((element) => {
              validationMessages.push({
                message: (<HTMLTableCellElement>element).innerText,
              });
              this.validationFailed = true;
            });
            if (validationMessages.length > 0) {
              resultArray.push(true);
              resultArray.push({ validationMessages: validationMessages });
            } else {
              resultArray.push(false);
              resultArray.push({ validationMessages: [] });
            }
          }

          // Search functionality not working
          const queryErrorMessage = document.querySelectorAll(".ErrorMessage");
          if (queryErrorMessage) {
            queryErrorMessage.forEach((element) => {
              errorMessages.push({
                message: (<HTMLTableCellElement>element).innerText,
              });
            });
            if (queryErrorMessage.length > 0) {
              resultArray.push(true);
              resultArray.push({ errorMessages: errorMessages });
            } else {
              resultArray.push(false);
              resultArray.push({ errorMessages: [] });
            }
          }
        }

        const items = iterateResultRows(query);
            resultArray.push(items);
        return resultArray;
      });

      console.log("responseGet==>", responseGet);
      this.data = {
        validationFailed: responseGet && responseGet[0],
        validationMessages: responseGet && responseGet[1].validationMessages,
        error: responseGet && responseGet[2],
        errorMessages: responseGet && responseGet[3].errorMessages,
        message: SUCCESS_MESSAGE,
        items: responseGet.slice(4)[0],
      };
      let Total_time = +new Date() - start;
      console.log("Total Process Time in milliseconds", Total_time);
      console.log("Process Completed Successfully");
      //await this.browser.close();
    } catch (Error) {
      this.data = {
        error: true,
        message: Error.message,
      };
      await this.browser.close();
    }
  }
  public async reLogin(path: string, username: string, password: string) {
    try {
      await this.page.goto(BASE_URL);

      await this.page.type('input[name="username"]', username);
      await this.page.type('input[name="userPassword"]', password);

      let signInButton = await this.page.$x('//*[@id="submit1"]');
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        signInButton[0].click(),
      ]);

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
        arrayList.push({
          id: uniqueID,
          status: jsonResponse.items[i].Status,
          statusMessage: jsonResponse.items[i].Description,
          quantity: jsonResponse.items[i].Availability.Qty
            ? jsonResponse.items[i].Availability.Qty
            : 0,
          // leadTime: graphQLResponse.ApplicableYears,
          supersededPartNumber:
            jsonResponse.items[i].Status == "CANCELED"
              ? jsonResponse.items[i].ItemNumber
              : null,
          requestedPartNumber: inputData.partInfos[i].partNumber,
          requestedQty: inputData.partInfos[i].requestedQty,
          requestedManufacturerType: inputData.manufacturerType.toString(),
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
      responseValidation:jsonResponse.validationFailed ? jsonResponse.validationMessages: [],
      responseError: errorResult,
    };
  }
}

const kawasakiDashboard = new KawasakiDashboard();
export { kawasakiDashboard };
