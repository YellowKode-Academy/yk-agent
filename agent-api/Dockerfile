FROM node:22-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY index.js .
EXPOSE 8080
CMD ["node", "index.js"]
