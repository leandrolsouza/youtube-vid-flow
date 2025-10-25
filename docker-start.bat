@echo off
echo Iniciando VidFlow com Docker Compose...

REM Criar diretório de downloads se não existir
if not exist "downloads" mkdir downloads

REM Copiar .env.example para .env se não existir
if not exist ".env" copy ".env.example" ".env"

REM Fazer build e iniciar os containers
docker-compose up --build -d

echo.
echo VidFlow iniciado com sucesso!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8081
echo.
echo Para parar: docker-compose down
echo Para ver logs: docker-compose logs -f
pause