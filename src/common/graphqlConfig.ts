import { Config, gql } from "apollo-server-lambda";
import { readFileSync } from "fs";
import { resolve } from "path";
import * as types from "./types";
import { KawasakiDashboard, kawasakiDashboard, yamahaDashboard, YamahaDashboard, polarisDashboard, PolarisDashboard  } from "../dashboards";

const {
  ApolloServerPluginLandingPageGraphQLPlayground,
} = require("apollo-server-core");

const typeDefs = gql(
  readFileSync(resolve(__dirname, "../../schema.graphql"), { encoding: "utf8" })
);

const resolvers: any = {
  DateTime: types.AwanooDateTime,
  Query: {
    queryOEMAvailability: async (
      _: any,
      args: { input: types.QueryInput },
      context
    ) => {
      // console.log(context.kawasakiDashBoard);
      let manufacturerType = args.input.manufacturerType.toString();
      switch (types.ManufacturerType[manufacturerType]) {
        case types.ManufacturerType.KAWASAKI:
          console.log("Calling Kawasaki dashboard...");
          let jsonResponseKawasaki = await context.kawasakiDashboard.crawl(
            args.input.partInfos
          );                    
          // transform json response to GraphQL specs
          let graphQLResponseKawasaki = KawasakiDashboard.transformJSON2GraphQL(
            jsonResponseKawasaki,
            args.input
          );
          return graphQLResponseKawasaki;
        case types.ManufacturerType.YAMAHA:
          console.log("Calling Yamaha dashboard...");
          let jsonResponseYamaha = await context.yamahaDashboard.crawl(
            args.input.partInfos
          );
          // transform json response to GraphQL specs
          let graphQLResponseYamaha = YamahaDashboard.transformJSON2GraphQL(
            jsonResponseYamaha,
            args.input
          );
          return graphQLResponseYamaha;
        case types.ManufacturerType.POLARIS:
          console.log("Calling Polaris dashboard...");
          let jsonResponsePolaris = await context.polarisDashboard.crawl(
            args.input.partInfos
          );
          // transform json response to GraphQL specs
          let graphQLResponsePolaris = PolarisDashboard.transformJSON2GraphQL(
            jsonResponsePolaris,
            args.input
          );
          return graphQLResponsePolaris;
        case types.ManufacturerType.HONDA:
          return {
            responseError: {
              code: "100",
              message: " Comming Soon...",
            }
          }
        default:
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

const plugins = [ApolloServerPluginLandingPageGraphQLPlayground({
        // options
      })];

const context = () => ({
      kawasakiDashboard: kawasakiDashboard,
      yamahaDashboard: yamahaDashboard,
      polarisDashboard: polarisDashboard
});

export const config: Config = {
        typeDefs,
        resolvers,
        context,
        plugins
}