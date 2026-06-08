FROM node:22-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY index.js .
RUN mkdir -p /app/data
EXPOSE 3002
CMD ["node", "index.js"]
