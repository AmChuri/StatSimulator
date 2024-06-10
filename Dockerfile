FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

ENV HOST 0.0.0.0

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port 8080 to the outside world
EXPOSE 8080

ENV PORT 8080

# Run the compiled JavaScript file when the container starts
CMD ["node", "dist/server.js"]
