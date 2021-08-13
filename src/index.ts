import { ApolloServer, gql } from "apollo-server";
const {
  ApolloServerPluginLandingPageGraphQLPlayground,
} = require("apollo-server-core");

import { readFileSync } from "fs";
import { resolve } from "path";
import * as types from "./common/types";
import * as agql from "./common/graphqlConfig";
import { KawasakiDashboard } from "./dashboards";

const typeDefs = gql(
  readFileSync(resolve(__dirname, "../schema.graphql"), { encoding: "utf8" })
);

const resolvers: any = {
  Query: {
    queryOEMAvailability: async (
      _: any,
      args: { input: types.QueryInput },
      context
    ) => {
      // console.log(context.kawasakiDashBoard);
      let manufacturerType = args.input.manufacturerType.toString();
      if (
        types.ManufacturerType[manufacturerType] ==
        types.ManufacturerType.KAWASAKI
      ) {
        console.log("Calling Kawasaki dashboard...");
        context.kawasakiDashBoard.crawl(args.input.partInfos);
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
      } else if (
        types.ManufacturerType[manufacturerType] ==
        types.ManufacturerType.YAMAHA
      ) {
        console.log("Calling Yamaha dashboard...");
        return {
          result: [
            {
              id: "200",
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
      } else {
        return {
          responseError: {
            code: "100",
            message: args.input.manufacturerType + " Not Supported Yet...",
          },
        };
      }
    },
  },
};

const kawasakiDB = new KawasakiDashboard();

try {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({
      kawasakiDashBoard: kawasakiDB,
    }),
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
