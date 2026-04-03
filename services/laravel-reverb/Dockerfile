FROM php:8.3-cli

RUN apt-get update \
  && apt-get install -y --no-install-recommends git unzip libzip-dev curl libonig-dev \
  && docker-php-ext-install mbstring pdo pdo_mysql pcntl session tokenizer \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN groupadd -g 10001 appuser && useradd -u 10001 -g appuser -m -s /usr/sbin/nologin appuser
WORKDIR /var/www
COPY bootstrap.sh /bootstrap.sh
RUN chmod +x /bootstrap.sh && chown -R appuser:appuser /var/www /bootstrap.sh

EXPOSE 36721 36722
USER appuser
CMD ["/bootstrap.sh"]
