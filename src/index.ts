import { ApolloServer, gql } from "apollo-server";
const {
  ApolloServerPluginLandingPageGraphQLPlayground,
} = require("apollo-server-core");

import { readFileSync } from "fs";
import { resolve } from "path";
import * as types from "./common/types";
import { KawasakiDashboard, kawasakiDashboard, yamahaDashboard, YamahaDashboard, polarisDashboard, PolarisDashboard, hondaDashboard, HondaDashboard, canAmDashboard, CanAmDashboard  } from "./dashboards";
import { config } from "./common/graphqlConfig";

const typeDefs = gql(
  readFileSync(resolve(__dirname, "../schema.graphql"), { encoding: "utf8" })
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
          console.log("Calling Honda dashboard...");
          let jsonResponseHonda = await context.hondaDashboard.crawl(
            args.input.partInfos
          );
          console.log("jsonResponseHonda==>", jsonResponseHonda);
          return {
            responseError: {
              code: "100",
              message: " Comming Soon...",
            }
          }
          case types.ManufacturerType.CAN_AM:
            console.log("Calling CanAm dashboard...");
            let jsonResponseCanAm = await context.canAmDashboard.crawl(
              args.input.partInfos
            );
            console.log("jsonResponseCanAm==>", jsonResponseCanAm);
            let graphQLResponseCanAm = CanAmDashboard.transformJSON2GraphQL(
              jsonResponseCanAm,
              args.input
            );
            console.log("graphQLResponseCanAm==>", graphQLResponseCanAm);
            return graphQLResponseCanAm;
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

try {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({
      kawasakiDashboard: kawasakiDashboard,
      yamahaDashboard: yamahaDashboard,
      polarisDashboard: polarisDashboard,
      hondaDashboard: hondaDashboard,
      canAmDashboard: canAmDashboard
    }),
    plugins: [
      ApolloServerPluginLandingPageGraphQLPlayground({
        // options
      }),
    ],
  });

  // const server = new ApolloServer(config);

  const port = process.env.PORT || 4000;
  server.listen({ port }).then(({ url }) => {
    console.log(`???? Bike Bandit OEM GraphQL service ready at ${url}`);
  });
} finally {
  //   console.log("Bike Bandit OEM GraphQL service is shutting down");
}
