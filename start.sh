#!/bin/sh

echo "Starting node server";
node app.js >> /var/log/node/matbee.log &
echo $! > app.pid

echo $!

