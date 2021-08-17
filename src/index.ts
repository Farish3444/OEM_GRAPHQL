import { ApolloServer, gql } from "apollo-server";
const {
  ApolloServerPluginLandingPageGraphQLPlayground,
} = require("apollo-server-core");

import { readFileSync } from "fs";
import { resolve } from "path";
import * as types from "./common/types";
import * as agql from "./common/graphqlConfig";
import { KawasakiDashboard, kawasakiDashboard, yamahaDashboard, YamahaDashboard } from "./dashboards";

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
      //   let manufacturerType = args.input.manufacturerType.toString();
      //   if (
      //     types.ManufacturerType[manufacturerType] ==
      //     types.ManufacturerType.KAWASAKI
      //   ) {
      //     console.log("Calling Kawasaki dashboard...");
      //     let jsonResponse = await context.kawasakiDashboard.crawl(
      //       args.input.partInfos
      //     );
      //     // transform json response to GraphQL specs
      //     let graphQLResponse = KawasakiDashboard.transformJSON2GraphQL(
      //       jsonResponse,
      //       args.input
      //     );
      //     return graphQLResponse;
      //   } else if (
      //     types.ManufacturerType[manufacturerType] ==
      //     types.ManufacturerType.YAMAHA
      //   ) {
      //     console.log("Calling Yamaha dashboard...");
      //     let jsonResponse = await context.yamahaDashboard.crawl(
      //       args.input.partInfos
      //     );
      //     console.log("jsonResponse", jsonResponse);
      //       // transform json response to GraphQL specs
      //       let graphQLResponse = YamahaDashboard.transformJSON2GraphQL(
      //         jsonResponse,
      //         args.input
      //       );
      //       return graphQLResponse;
      //   } else {
      //     return {
      //       responseError: {
      //         code: "100",
      //         message: args.input.manufacturerType + " Not Supported Yet...",
      //       },
      //     };
      //   }
    },
  },
};

try {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({
      kawasakiDashboard: kawasakiDashboard,
      yamahaDashboard: yamahaDashboard
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
