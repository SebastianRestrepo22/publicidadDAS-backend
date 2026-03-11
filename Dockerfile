# Imagen base Node.js
FROM node:20

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Variables de entorno (placeholders, sin valores reales)
ENV DB_HOST=""
ENV DB_USER=""
ENV DB_PASSWORD=""
ENV DB_NAME=""
ENV PORT=5000
ENV JWT_KEY=""
ENV EMAIL_USER=""
ENV EMAIL_PASS=""

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el código
COPY . .

# Exponer el puerto que usa el backend
EXPOSE 5000

# Comando para arrancar el backend
CMD ["npm", "start"]