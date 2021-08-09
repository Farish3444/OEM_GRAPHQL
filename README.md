# Bike Bandit

Bike Bandit GraphQL Project

## Requirements

- Node >= 16
- Visual Studio Code

## Code repo setup

- Clone the [awanoo bitbucket repo](https://bitbucket.org/awanoo/oem_graphql/src/master/)

- SSH

```bash
git clone git@bitbucket.org:awanoo/oem_graphql.git
```

- HTTPS

```bash
git clone https://cheeloo@bitbucket.org/awanoo/oem_graphql.git
```

- `npm install` in main directory

```bash
npm install
or
yarn install
```

### Quick build script

- `tsc --build tsconfig.json` in main directory
  or
- `yarn watch`
  or
- `npm run watch`

### Quick start script

There is a `start.js` script that will run availability graphql service locally. We combine this in the projects `start` script with nodemon that you can run:

```bash
npm start or npm run start
```

or

```bash
yarn start
```

To run without nodemon:

```bash
node start.js
```
