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
   responseErrors{
      code
      identifier
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
   responseErrors{
      code
      identifier
      message
    }
  }
}


# POLARIS Query
query BB_OEM {
  queryOEMAvailability (input: {
    manufacturerType: POLARIS,
    partInfos: [
  {partNumber:"5437778", requestedQty: 5}
   
    ]
  }) {
    result {
      id
      quantity
      status
      statusMessage
      requestedPartNumber
      requestedQty
      requestedManufacturerType
      supersededPartNumber
    }
    responseErrors{
      code
      identifier
      message
    }
  }
}

# CanAm
query BB_OEM {
  queryOEMAvailability (input: {
    manufacturerType: CAN_AM,
    partInfos: [
  {partNumber:"709200395", requestedQty: 1, productLine: 90}]
  }) {
    result {
      id
      quantity
      statusMessage
      requestedPartNumber
      requestedQty
    }
    responseErrors{
      code
      identifier
      message
    }
  }
}