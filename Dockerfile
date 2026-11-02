FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY backend ./backend
COPY frontend ./frontend
EXPOSE 5000
USER node
CMD ["node", "backend/server.js"]
