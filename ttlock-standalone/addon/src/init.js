'use strict';

const HomeAssistant = require('./ha');
// add simple http authentication
const auth = require("basic-auth");
const os = require("os");


/**
 * Handle the initialisation process
 * - load saved data
 * - create manager
 * - create express app
 * @param {Object} options
 * @param {string} options.settingsPath Path to the file in which lock data settings are saved
 * @param {string} options.mqttHost MQTT host
 * @param {string} options.mqttPort MQTT port
 * @param {string} options.mqttSSL MQTT ssl
 * @param {string} options.mqttUser MQTT username
 * @param {string} options.mqttPass MQTT password
 * @param {'none'|'noble'} options.gateway External BLE gateway type
 * @param {string} options.gateway_host Gateway hostname or IP
 * @param {number} options.gateway_port Gateway port
 * @param {string} options.gateway_key Gateway AES key
 * @param {string} options.gateway_user Gateway username
 * @param {string} options.gateway_pass  Gateway password
 */
module.exports = async (options) => {
  // console.log("Options:", JSON.stringify(options));
  if (typeof options == "undefined") {
    options = {};
  }

  // load saved data
  const store = require("./store");
  if (options.settingsPath) {
    store.setDataPath(options.settingsPath);
  }
  await store.loadData();


  // initialize manager
  const manager = require("./manager");
  if (options.gateway  && options.gateway == "noble") {
    manager.setNobleGateway(
      options.gateway_host,
      options.gateway_port,
      options.gateway_key,
      options.gateway_user,
      options.gateway_pass
    );
  }
  var ha;
  if (options.mqttHost && options.mqttUser && options.mqttPass) {
    const haOptions = {
      mqttUrl: (options.mqttSSL == 'true' ? 'mqtts://' : 'mqtt://') + options.mqttHost + ':' + options.mqttPort,
      mqttUser: options.mqttUser,
      mqttPass: options.mqttPass
    }
    ha = new HomeAssistant(haOptions);
      // try-catch MQTT connection, and give more readable message on error
      try {
        await ha.connect();
        console.log("✅️ Connected to MQTT server: ", haOptions.mqttUrl);
      } catch(err) {
        console.error("❌ Unable to connect to MQTT server:", haOptions.mqttUrl);
        console.error("Error:", err.message || err);
        // kill
        process.exit(1);
      }
  }

  await manager.init();

  // create express app
  const express = require("express");
  const app = express();
  let port = 55099;
  if (options.port) {
    port = options.port;
  }

  // ----------------------------------------------------
  // basic http auth , fallback to default "admin:admin"
  const basicAuth = (req, res, next) => {
    const user = auth(req);
    const uname = options.http_user;
    const passwd = options.http_passwd;

    if (!user || user.name !== uname || user.pass !== passwd) {
      res.set("WWW-Authenticate", 'Basic realm="Restricted Area"');
      return res.status(401).send("Authentication required.");
    }
    next();
  };
  app.use(basicAuth);
  // --------------------------------------------------- 

  // Because we use host networking we need to filter out 
  // all requests except those coming from the HA proxy
  let localIP = [
    "172.30.32.2",
    "::ffff:172.30.32.2",
    "::1",
    "::ffff:127.0.0.1"
  ];
  if (options.localIP) {
    localIP = options.localIP;
  }
  app.use((req, res, next) => {
    // stand-alone - disable IP filtering.
    //if (!localIP.includes(req.ip)) {
    //  res.status(403).send("Denied");
    //} else {
      next();
    //}
  });

  app.use("/frontend", express.static("frontend"));
  // app.use("/api", require("../api/index_old"));

  const server = app.listen(port, () => {
    const nets = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // IPv4, no local addresses: 127.0.0.1 & fe80::
            if (net.family === "IPv4" && !net.internal) {
                ips.push(net.address);
            }
        }
    }
    console.log("✅️ Server started, listening on port: ", port);
    console.log("  Available at:");
    ips.forEach(ip => {
        console.log(`  ► http://${ip}:${port}/frontend`);
    });
  });

  const api = require("../api/index");
  api(server);
}

