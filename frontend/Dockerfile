# =========================
# Etapa 1️⃣ - Build do frontend
# =========================
FROM node:20 AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# =========================
# Etapa 2️⃣ - Servir com Nginx
# =========================
FROM nginx:alpine

# Copia o build para o diretório padrão do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia configuração customizada do Nginx (se existir)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta padrão
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
