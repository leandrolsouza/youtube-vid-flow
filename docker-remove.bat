@echo off
echo Parando e removendo containers do projeto...
docker-compose down -v

echo Removendo imagens do projeto...
docker rmi VidFlow-backend VidFlow-frontend 2>nul
docker rmi youtube-vid-flow-backend youtube-vid-flow-frontend 2>nul

echo Removendo network do projeto...
docker network rm VidFlow-network 2>nul

echo Limpeza concluida!
pause
