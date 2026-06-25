# Deploy aitokenweight To Alibaba Cloud ECS

aitokenweight is a static Vite app. The recommended ECS path is to build once, then serve the generated `dist/` directory with Nginx.

## Build

```bash
npm ci
npm run lint
npm run build
```

The production artifact is:

```text
dist/
```

## ECS Checklist

- Create an ECS instance with a recent Linux image.
- Open security group inbound ports `80` and `443`.
- Point the domain DNS record to the ECS public IP if a domain is used.
- Install Nginx on the server.
- Upload or sync the local `dist/` directory to `/var/www/aitokenweight`.
- Install HTTPS through Alibaba Cloud certificate tooling or Certbot.
- Keep rollback simple by preserving the previous `dist` directory before replacing it.

## Nginx Site

Copy `deploy/nginx.conf` to an Nginx site file and adjust `server_name`.

Example path:

```bash
sudo cp deploy/nginx.conf /etc/nginx/conf.d/aitokenweight.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Manual Upload Example

From the build machine:

```bash
rsync -av --delete dist/ root@YOUR_ECS_IP:/var/www/aitokenweight/
```

Use SSH keys or the operator's preferred secure deployment method. Do not put ECS credentials, passwords, access keys, or certificates into this repository.

## Rollback

Before replacing the live artifact:

```bash
sudo cp -a /var/www/aitokenweight /var/www/aitokenweight.previous
```

Rollback:

```bash
sudo rm -rf /var/www/aitokenweight
sudo mv /var/www/aitokenweight.previous /var/www/aitokenweight
sudo systemctl reload nginx
```
