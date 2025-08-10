#!/bin/bash


# Default values
USERNAME="admin"
PASSWORD="mypassword"
DATABASE="health-auto-export"
ENVIRONMENT="production"
ADMIN_USER="admin"
ADMIN_PASSWORD="mypassword"
PORT="27017"

# Generate random tokens for authentication
READ_TOKEN=sk-$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
WRITE_TOKEN=sk-$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)


echo "Creating .env file..."
cat > .env << EOF
### Server Config
NODE_ENV=${ENVIRONMENT}
READ_TOKEN=${READ_TOKEN}
WRITE_TOKEN=${WRITE_TOKEN}
###  MongoDB Config
MONGO_HOST=hae-mongo
MONGO_USERNAME=${USERNAME}
MONGO_PASSWORD=${PASSWORD}
MONGO_DB=${DATABASE}
MONGO_PORT=${PORT}
### Grafana Config
ADMIN_USER=${ADMIN_USER}
ADMIN_PASSWORD=${ADMIN_PASSWORD}

EOF

echo "Environment configuration saved to .env file ✅"
