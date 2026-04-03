FROM php:8.3-cli

RUN apt-get update && apt-get install -y git unzip libzip-dev curl && docker-php-ext-install pdo pdo_mysql pcntl
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY bootstrap.sh /bootstrap.sh
RUN chmod +x /bootstrap.sh

EXPOSE 36721 36722
CMD ["/bootstrap.sh"]
