FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# npm ci for reproducible installs; omit dev deps for a smaller image.
# prisma generate must run after install (the generated client is not committed).
RUN npm ci --omit=dev && npx prisma generate

COPY . .

# App reads PORT env (default 5000). Render injects its own PORT.
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
