cp -n ./nginx.conf /var/www/;
nginx -s stop;
nginx -c /var/www/nginx.conf;
psql -f ./db/setup_table.sql;
redis-server ./redis.conf;
npm install;
npm run start