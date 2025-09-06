# Running TTLock lock addon for HA as a standalone application

Original readme: :point_right: [Original README.md](README-ORG.md)

This project is based on a fork of [kind3r/hass-addons](https://github.com/kind3r/hass-addons).  
However, since this version is designed to run completely standalone — without Home Assistant —  
it should be considered a separate project rather than just another HA addon.

If I find a better, more polished, and less laggy addon in the future, I may use it as a new base  
to continue the standalone work.

---

I got one of those TTLock smart door knobs/locks. Since I really don’t like cloud solutions for anything security-related (and a CN-based cloud is a BIG nope for me), I wanted to avoid relying on it.

The addon is also a bit outdated, and I wasn’t sure if it could still be added to HA in the usual way. On top of that, I don’t run Home Assistant like most people do – I have it in a Docker container on my home server, which also runs other services, so HA addons are not for me.

So, I had to figure out a way to run it :expressionless: without HA. At first I couldn’t wrap my head around getting the BT bridge to run remotely on a Pi0W, and I still needed a way to run the addon as a standalone container/application accessible from the network. I decided to start with the container itself, since it already includes everything anyway.

## How HA addons work
HA addons are basically Docker containers controlled by the Home Assistant Supervisor. The Supervisor provides them with additional data (environment variables containing HA config such as the MQTT server info, API keys, or addon configuration). For this purpose, HA uses its own shell wrapper called `bashio`, which is basically `sh` with additional functions that expose HA information.

HA also acts as a proxy server for addon web UIs: when you open a page in HA, the content is actually fetched from the running addon container’s web server. Addon containers run in an internal Docker network (`172.30.32.0/23`), which supports up to 509 addon containers.

---
## Running ttlock-addon as a standalone container (without HA)
:one: First, I had to figure out what data Home Assistant passes into the container, and which configuration variables the addon actually needs.
:two: Next, I needed to get access to the web UI. The problem was that it checked the incoming IP address — if it didn’t match HA’s internal Docker network, the server simply returned `Denied` in the browser.

After digging through the code (lucky me, Node.js is just JavaScript, which I’m familiar with), I discovered that I basically had to modify two files:
1. The init script that is executed when the container starts. It reads configuration via `bashio` (from the HA Supervisor) and passes values to the server code.
2. The main server code that runs also the web UI.

### Init script

Everything starts with `start.sh`, written for `bashio`. It’s executed whenever the container launches.

Since there’s no HA Supervisor in my setup, I replaced the `bashio` interpreter with a standard shell: `#!/usr/bin/env sh`

Then I defined the needed environment variables directly in the Docker container (set either via `docker run` or `docker-compose.yml`).
I also introduced two new variables for a simple username/password login to the web UI.

At first, I hard-coded these values during testing, but now they’re commented out and instead provided through the compose file.
In the end, the init script just prepares the environment and starts the web server :smile: .

### Main (web UI) server

This logic lives in `addon/index.js` . 

The first obstacle was the IP check:
```js
if (!localIP.includes(req.ip)) {
    res.send("Denied");
    return;
}
```
I commented out these lines (and their surrounding braces) to bypass the restriction.

Once the UI was accessible, I improved error handling in the MQTT connection part. Specifically, I wrapped the `await ha.connect()` call in a `try { } catch (err) { }` block so that errors produce readable console output instead of obscure cryptographic error messages.

Also added a console log showing which URLs the app is using.

Finally, I added simple HTTP Basic Auth to the UI to keep curious users or pranksters out of the lock configuration :upside_down_face:.
This required adding the basic-auth dependency to addon/package.json.

Finally I renamed the directory :upside_down_face:

You can see the exact changes in this diff file:  [code-changes.diff](code-changes.diff)

---
## Setting things up

### Hardware

I used Pi4 for building, and 32bit raspbian lite version. Then I moved the sdcard to Pi0w2 (v2 because it use newer CPU).


### Prerequisites
You need Docker and basic container build tools.
Follow the official Docker installation guide for your platform:
👉 https://docs.docker.com/engine/install/debian/

*(choose 32-bit if you’re on Raspbian 32-bit, or 64-bit if running a 64-bit OS on your Pi)*

Add your user to docker group so you can manage docker without sudo or from root:
```bash
sudo usermod -aG docker <your_user>
```
Swap `<your_user>` to `pi` or user name that you're using. Open new SSH session to get new rights updated.

### Build addon container image

Clone the original repo and apply the `standalone.patch`, or simply use my fork with changes already included:

```bash
git clone https://github.com/saper-2/ha-addon-tt-lock-standalone.git
```

Then go into the integration folder and build the image:
```bash
cd ~/ha-addon-tt-lock-standalone/ttlock-standalone
docker build --build-arg BUILD_FROM="node:18-alpine" -t ttlock-standalone .
```
:information_source: The `BUILD_FROM` argument is required because the Dockerfile expects a base image from HA build system. We explicitly set it to `node:18-alpine`.
The resulting image will be tagged as `ttlock-standalone` and stored locally.

---
### Preparing to run the container

Create a working directory in your home folder (example assumes user `pi`):

```bash
mkdir -p /home/pi/ttlock/data
```

Copy or create a `docker-compose.yaml` file inside `/home/pi/ttlock` with contents similar to:
```yaml
version: "3.9"

services:
  ttlock:
    image: ttlock-standalone
    container_name: ttlock
    network_mode: "host"
    privileged: true
    restart: unless-stopped
    volumes:
      - /var/run/dbus:/var/run/dbus
      - /home/pi/ttlock/data:/data
    environment:
      MQTT_HOST: "<your_mqtt_server_ip>"
      MQTT_PORT: 1883
      MQTT_SSL: 0
      MQTT_USER: "<mqtt_user>"
      MQTT_PASS: "<mqtt_pass>"
      #GATEWAY: "noble"
      #GATEWAY_HOST: "127.0.0.1"
      #GATEWAY_PORT: ""
      GATEWAY_KEY: "f8b55c272eb007f501560839be1f1e7e" #key from tt-sdk-js
      GATEWAY_USER: "admin" #from tt-sdk-js
      GATEWAY_PASS: "admin" #from tt-sdk-js
      #TTLOCK_IGNORE_CRC: 1
      #NOBLE_WEBSOCKET: 1 #when GATEWAY=="noble"
      #TTLOCK_DEBUG_COMM: 1
      #MQTT_DEBUG: 1
      #WEBSOCKET_DEBUG: 1 #"gateway_debug"
      # set user&pass for web-ui
      HTTP_USER: "pi"
      HTTP_PASS: "1234"
```

Adjust environment variables (`MQTT_*`, `HTTP_USER`, `HTTP_PASS`) and paths to fit your setup.

---
### Running the container

To start the container in the foreground and see logs:
```bash
cd ~/ttlock
docker compose up
```
*:information_source: you run `docker compose` from directory where you have the file `docker-compose.yaml`*

Now open the web UI in your browser (replace `<pi_ip>` with your Pi’s IP address):
```
http://<pi_ip>:55099/frontend
```

If it works, stop the container with CTRL+C, then run it detached (in the background):

```bash
docker compose up -d
```

---
#### Useful Docker commands

##### Stop the container:
```bash
docker compose down
```

##### Stop, remove container image, then up it again:
```bash
docker compose down
docker image rm ttlock-standalone
```
Now rebuild docker image, and then:
```bash
docker compose up -d
```

##### View logs without attaching (safe):
```bash
docker logs ttlock
```

##### Open an interactive shell inside the running container:
```bash
docker exec -it ttlock /bin/sh
```

##### Detach from the shell without killing the container:
```
Ctrl + P, Ctrl + Q
```

----
## :information_source: Hints

- If you are getting many operation failures when trying to perform actions (add card, PIN, etc.) and see a lot of `bad CRC` messages in the console, try uncommenting `TTLOCK_IGNORE_CRC: 1` in the compose file and restart the container. This might also make the app slightly more responsive.
- If you're using Pi4 or 5 as build platform, then all the pairing and so on, you have to do when you move the card to Pi0W2 - Pi0 (v1) won't work, it uses different CPU architecture and docker won't run.