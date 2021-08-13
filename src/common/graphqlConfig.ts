import { gql } from "apollo-server";
import { readFileSync } from "fs";
import { resolve } from "path";
import * as types from "./types";

export const typeDefs = gql(
  readFileSync(resolve(__dirname, "../../schema.graphql"), { encoding: "utf8" })
);

export const resolvers: any = {
  Query: {
    queryOEMAvailability: async (_: any, args: { input: types.QueryInput }) => {
      // Sample Error Response
      // return {
      //   responseError: {
      //     code: "123",
      //     message: "Some Errors",
      //   },
      // };

      // Sample JSON Response
      return {
        result: [
          {
            id: "100",
            status: "Some Status...",
            statusMessage: "statusMessage(optional)",
            quantity: 1,
            leadTime: "1 week",
            requestedPartNumber: args.input.partInfos[0].partNumber,
            requestedQty: args.input.partInfos[0].requestedQty,
            requestedManufacturerType: args.input.manufacturerType,
          },
        ],
      };
    },
  },
};

export const plugins = `[
      ApolloServerPluginLandingPageGraphQLPlayground({
        // options
      }),
    ]`;
