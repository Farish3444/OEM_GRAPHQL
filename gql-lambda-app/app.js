const { ApolloServer } = require('apollo-server-lambda')
const { createConfig } = require('./config')

console.log('running as lambda')

const server = new ApolloServer(createConfig())

exports.lambdaHandler = server.createHandler();