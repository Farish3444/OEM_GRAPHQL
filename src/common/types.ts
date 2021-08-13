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

// interface for OEMPartInfo
export interface OEMPartInfo {
  partNumber: string;
  requestedQty: number;
  skuId?: string;
  VIN?: string;
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
}

// interface for ResponseError
export interface ResponseError {
  code: string;
  message: string;
}

// interface for OEMAvailabilityResponse
export interface OEMAvailabilityResponse {
  result?: AvailabilityInfo[];
  responseError?: ResponseError;
}
