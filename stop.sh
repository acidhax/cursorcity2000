#!/bin/sh
somevar=`cat app.pid`

echo "Stopping node server"
echo $somevar

kill -9 $somevar

rm app.pid

