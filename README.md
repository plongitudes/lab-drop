# Lab Drop

> **A fork of [lab-dash](https://github.com/AnthonyGress/lab-dash) by Anthony Gress**, licensed under GPL-3.0.
> Lab Drop builds on lab-dash with a free-2D drag-and-drop tile layout and a hardened backend
> (fail-closed secrets, deny-by-default auth on state-changing endpoints, command-injection and
> path-traversal fixes). All credit for the original project goes to the upstream author and
> contributors. See [`LICENSE`](./LICENSE) and the upstream repo for history.

This is an open-source user interface designed to be your internally hosted homepage for your homelab/server. 

<img width="1912" alt="Screenshot 2025-05-08 at 8 58 34 PM" src="https://github.com/user-attachments/assets/55ae6a22-33e3-40ab-b1e2-a8deeaa5239b" />


# Features
Lab Drop features a customizable grid layout where you can add various widgets:
- Shortcuts to your tools/services
- System information
- Service health checks
- Custom widgets and more

### Customization
You can easily customize your dashboard by:
- Dragging and reordering
- Changing the background image
- Adding custom search providers
- Custom title and tab name

### Privacy & Data Control
You have complete control over your data and dashboard configuration.
- All data is stored & used on your own device
- Sensitive data is encrypted locally using [AES-256-CBC](https://www.kiteworks.com/risk-compliance-glossary/aes-256-encryption/)
- Only administrator accounts can make changes
- Configurations can be easily backed up and restored

# Installation
This only requires docker to be installed. [Install Docker](https://docs.docker.com/engine/install/). Run using `docker compose`
```yaml
---
services:
  lab-drop:
    container_name: lab-drop
    image: ghcr.io/plongitudes/lab-drop:latest
    # privileged + network_mode: host are only needed for network-usage stats.
    #privileged: true
    #network_mode: host   # then e.g. `sudo ufw allow 2022/tcp` on Ubuntu
    ports:
      - 2022:2022
    environment:
      # Run the app as this uid:gid (defaults = unraid's nobody:users).
      # On a plain Linux host set your own, e.g. PUID=1000 PGID=1000.
      - PUID=99
      - PGID=100
      # SECRET is optional. If omitted, a random per-install secret is generated
      # and persisted to the config volume (/config/.secret) on first run.
      # Only set it to manage the key yourself (e.g. `openssl rand -base64 32`).
      # - SECRET=CHANGE_ME_TO_A_RANDOM_VALUE
    volumes:
      - ./config:/config
      - ./uploads:/app/public/uploads
      # Optional: read-only /sys for temperature/sensor readings.
      - /sys:/sys:ro
    restart: unless-stopped
```

# Usage
Lab Drop can aslo be accessed from any web browser via 
- `http://localhost:2022` on the device running the container
- `192.168.x.x:2022` on local network  
- `www.your-homepage.com` using your custom domain name

Lab Drop can also be installed as an app on your computer/phone as a PWA (Progressive Web App):
- Using Google Chrome on Mac/Windows/Android/Linux
- Using Safari on iOS/iPad OS via the share menu > add to homscreen
  
<img width="391" alt="Screenshot 2025-03-24 at 12 13 07 AM" src="https://github.com/user-attachments/assets/2b6ec3b4-5cda-4cd0-b8aa-70185477b633" />  


> [!IMPORTANT]  
> You should assign a static IP address for you server so any LAN/WAN device can access the Lab Drop instance.

Simply copy/download the [docker-compose.yml](docker-compose.yml) or add it to an existing docker-compose file.


## Running Docker compose file

```bash
docker compose up -d
```

This docker container will restart automatically after reboots unless it was manually stopped. This is designed to be run on your hosting server.

## Stopping this docker container
1. Navigate to the directory that this docker compose file is in
2. Run: `docker compose down`

# Local Development
```
npm install
npm run dev
```

# Updating
### Portainer
- Navigate to stacks
- Click on the `lab-drop` stack
- Click Editor tab at the top
- Click Update the stack
- Enable Re-pull image and redploy toggle
- Click Update

### Docker CLI:
- `cd /directory_of_compose_yaml`
- `docker compose down`
- `docker compose pull`
- `docker compose up -d`

# Contributing
Contributions to Lab Drop are welcome! Please follow these guidelines:

- **One feature per PR** - Keep pull requests focused on a single feature or fix
- **Review AI-generated code** - If using AI tools, all code must be thoroughly reviewed and tested before submitting
- **Maintain consistency** - New code must align with the app's existing style, theme, and overall user experience

# Disclaimer
This code is provided for informational and educational purposes only. I am not associated with any of the services/applications mentioned in this project.
