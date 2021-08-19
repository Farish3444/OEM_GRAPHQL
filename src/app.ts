import { ApolloServer } from "apollo-server-lambda";
import { config } from "./common/graphqlConfig";

const server = new ApolloServer(config);

exports.OEMLambdaHandler = server.createHandler();
