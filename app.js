const { ApolloServer } = require('apollo-server-lambda')
const { config } = require('dist/common/graphqlConfig')

console.log('running as lambda')

const server = new ApolloServer(config)

exports.lambdaHandler = server.createHandler();