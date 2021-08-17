# KAWASAKI Query
query BB_OEM {
  queryOEMAvailability (input: {
    manufacturerType: KAWASAKI,
    partInfos: [
  {partNumber:"12046-0063", requestedQty: 25},
    {partNumber:"11065-1290", requestedQty: 2},
    {partNumber:"92066-0915", requestedQty: 25},
    {partNumber:"92066-0916", requestedQty: 1}
    ]
  }) {
    result {
      id
      status
      statusMessage
      requestedPartNumber
      requestedQty
      requestedManufacturerType
      supersededPartNumber
    }
    responseValidation {
      message
    }
    responseError {
      code
      message
    }
  }
}


# YAMAHA Query
query BB_OEM {
  queryOEMAvailability (input: {
    manufacturerType: YAMAHA,
    partInfos: [
  {partNumber:"90467-20M15-00", requestedQty: 5}
   
    ]
  }) {
    result {
      id
      status
      statusMessage
      requestedPartNumber
      requestedQty
      requestedManufacturerType
      supersededPartNumber
    }
    responseError {
      code
      message
    }
  }
}