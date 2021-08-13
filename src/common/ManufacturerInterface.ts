import * as types from "./types";

export interface ManufacturerInterface {
  initialize();
  login(userName: string, password: string, dealerNumber: string);
  inquiry(partInfos: [types.OEMPartInfo]);
  crawl(partInfos: [types.OEMPartInfo]);
}
