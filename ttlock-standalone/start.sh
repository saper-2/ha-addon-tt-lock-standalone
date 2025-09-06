#!/usr/bin/env sh

#
# ---- ALL ENV variables are passed via docker-compose.yaml file ----
#
#export MQTT_HOST="192.168.2.122"
#export MQTT_PORT=1883
#export MQTT_SSL=0
#export MQTT_USER="test1"
#export MQTT_PASS="test1"
#export GATEWAY= 
#export GATEWAY_HOST= 
#export GATEWAY_PORT= 
#export GATEWAY_KEY="f8b55c272eb007f501560839be1f1e7e" 
#export GATEWAY_USER="admin" 
#export GATEWAY_PASS="admin" 

# if (bashio::config.true "ignore_crc"); then
#  echo "IGNORE CRC TRUE"
#  export TTLOCK_IGNORE_CRC=1
# fi
# if (bashio::config.equals "gateway" "noble"); then
#  echo "Disable noble auto-binding"
#  export NOBLE_WEBSOCKET=1
# fi
# if (bashio::config.true "debug_communication"); then
#  echo "Debug communication ON"
#  export TTLOCK_DEBUG_COMM=1
# fi
# if (bashio::config.true "debug_mqtt"); then
#  echo "Debug MQTT"
#  export MQTT_DEBUG=1
# fi
# if (bashio::config.true "gateway_debug"); then
#  echo "Debug gateway"
#  export WEBSOCKET_DEBUG=1
# fi

cd /app
npm start