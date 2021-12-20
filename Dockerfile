FROM node:16.13.0-alpine

WORKDIR /usr/app

RUN pwd

RUN node --version

COPY package*.json ./

COPY tsconfig.json ./

COPY src ./src

RUN ls -la

RUN npm install

RUN npm run build


FROM node:16.13.0-alpine

WORKDIR /usr/app

COPY package*.json ./

RUN npm install --only=production

COPY .env ./

COPY --from=0 /usr/app/dist ./dist

RUN ls -la

RUN npm install pm2 -g

ENV PORT=8326

EXPOSE $PORT

CMD ["pm2-runtime", "dist/server.js"]
