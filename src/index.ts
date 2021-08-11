import { ApolloServer, gql } from "apollo-server";
const {
  ApolloServerPluginLandingPageGraphQLPlayground,
} = require("apollo-server-core");

import { readFileSync } from "fs";
import { resolve } from "path";
import * as types from "./common/types";

const typeDefs = gql(
  readFileSync(resolve(__dirname, "../schema.graphql"), { encoding: "utf8" })
);

const resolvers: any = {
  Query: {
    // hello: async () => {
    //   let result = "Hello World";
    //   return result;
    // },
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

try {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginLandingPageGraphQLPlayground({
        // options
      }),
    ],
  });

  const port = process.env.PORT || 4000;
  server.listen({ port }).then(({ url }) => {
    console.log(`🚀 Bike Bandit OEM GraphQL service ready at ${url}`);
  });
} finally {
  //   console.log("Bike Bandit OEM GraphQL service is shutting down");
}
