export { AwanooDateTime } from "./scalars/DateTime";

//ENUM value for the manufacturer type
export enum ManufacturerType {
  KAWASAKI,
  YAMAHA,
  HONDA,
  HUSQVARNA,
  KTM,
  POLARIS,
  SUZUKI,
  CAN_AM,
  SEA_DOO,
  TRIUMPH,
  APRILLIA,
  ARCTIC_CAT,
  KYMCO,
  MOTO_GUZZI,
  PIAGGIO,
  VESPA,
  BMW,
}

export enum ProductLine {
  ATV = 8,
  Watercraft = 51,
  Roadster = 60,
  SidebySide = 90
}

// interface for OEMPartInfo
export interface OEMPartInfo {
  partNumber: string;
  requestedQty: number;
  skuId?: string;
  VIN?: string;
  vehicleType: string;
  productLine?: number;
}

// interface for QueryInput
export interface QueryInput {
  manufacturerType: ManufacturerType;
  partInfos: OEMPartInfo[];
}

// interface for AvailabilityInfo
export interface AvailabilityInfo {
  id: string;
  status: string;
  statusMessage?: string;
  quantity: number;
  leadTime?: string;
  supersedePartNumber?: string;
  requestedPartNumber: string;
  requestedQty: number;
  requestedSkuId?: string;
  requestedManufacturerType: string;
  timeStamp: Date;
}

// interface for ResponseError
export interface ResponseError {
  code: number;
  identifier?:string;
  message: string;
}

// interface for OEMAvailabilityResponse
export interface OEMAvailabilityResponse {
  result?: AvailabilityInfo[];
  responseErrors?: ResponseError[];
}
