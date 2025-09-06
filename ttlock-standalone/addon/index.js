'use strict';

// Catch errors from noble
process.on('uncaughtException', (error, promise) => {
  console.error('uncaughtException catch:', promise);
  console.error(error);
  const manager = require("./src/manager");
  manager.startupStatus = 1;
});

const init = require("./src/init");
init({
 // options go here
  settingsPath: process.env.DATA_PATH || "/data",
  mqttHost: process.env.MQTT_HOST,
  mqttPort: process.env.MQTT_PORT,
  mqttSSL: process.env.MQTT_SSL,
  mqttUser: process.env.MQTT_USER,
  mqttPass: process.env.MQTT_PASS,
  gateway: process.env.GATEWAY || "none",
  gateway_host: process.env.GATEWAY_HOST || "127.0.0.1",
  gateway_port: process.env.GATEWAY_PORT || 2846,
  gateway_key: process.env.GATEWAY_KEY,
  gateway_user: process.env.GATEWAY_USER,
  gateway_pass: process.env.GATEWAY_PASS,
  // --- HTTP AUTH user&pass + fallback to `admin`:`admin`
  http_user: process.env.HTTP_USER || "admin",
  http_passwd: process.env.HTTP_PASS || "admin"
});
