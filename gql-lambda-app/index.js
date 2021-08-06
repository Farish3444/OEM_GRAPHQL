const { ApolloServer } = require('apollo-server')

const { createConfig } = require('./config')

console.log('running as server')

const server = new ApolloServer(createConfig())

server.listen();