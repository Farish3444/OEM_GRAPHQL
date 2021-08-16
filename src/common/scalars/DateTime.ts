import { Kind, GraphQLScalarType } from "graphql";

export const AwanooDateTime = new GraphQLScalarType({
  name: "DateTime",
  description:
    "A date and time, represented as an ISO-8601 string in the format YYYY-MM-DDThh:mm:ss.sssZ",
  serialize(value) {
    return value.toISOString(); // Convert outgoing Date to integer for JSON
  },
  parseValue(value) {
    return new Date(value); // Convert incoming integer to Date
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value)); // Convert hard-coded AST string to integer and then to Date
    }
    return null; // Invalid hard-coded value (not an integer)
  },
});
