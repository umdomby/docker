FROM node:18-alpine

# Устанавливаем Yarn глобально
RUN npm install -g yarn

WORKDIR /app

# Копируем файлы блокировки зависимостей
COPY yarn.lock .
COPY package.json .

# Устанавливаем зависимости через Yarn
RUN yarn install --frozen-lockfile --production

# Копируем остальные файлы
COPY . .

# Собираем проект (если нужно)
RUN yarn build

EXPOSE 1444

CMD ["yarn", "start"]