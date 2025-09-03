FROM node:lts-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package definition files first to leverage Docker cache
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy the remaining source code
COPY . .

# Build the TypeScript into JavaScript
RUN npm run build

# Define default environment variables. These can be overridden at runtime.
ENV EXPORT_FILE=/data/export.zip
ENV API_URL=http://hae-server:3001/api/data

# Command to run the ingestion script
CMD ["node", "dist/ingest-export.js"]
