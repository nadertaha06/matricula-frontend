#!/usr/bin/env bash
set -Eeuo pipefail
image=${1:?Informe a imagem com tag do commit}
service=matricula-frontend
install -m 700 -d "$HOME/.config/matricula"
exec 9>"$HOME/.config/matricula/deploy.lock"
flock -w 300 9
docker pull "$image"
previous=$(docker inspect --format '{{.Config.Image}}' "$service" 2>/dev/null || true)
run_container() {
  docker run -d --name "$service" --network rede --restart unless-stopped \
    --label projeto=matricula -p 127.0.0.1:5173:80 "$1"
}
if docker inspect "$service" >/dev/null 2>&1; then
  docker stop --time 20 "$service"
  docker rm "$service"
fi
rollback() {
  docker rm -f "$service" >/dev/null 2>&1 || true
  if [ -n "$previous" ]; then run_container "$previous"; fi
  echo 'Deploy falhou; imagem anterior restaurada quando disponivel.' >&2
  exit 1
}
run_container "$image" || rollback
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:5173/health >/dev/null && \
     curl -fsS --max-time 2 http://127.0.0.1:5173/ | grep -q 'id="root"'; then
    echo 'Frontend implantado e verificado.'
    exit 0
  fi
  sleep 2
done
rollback
