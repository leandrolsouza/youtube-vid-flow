# VidFlow 🎥

Modern video downloader with a beautiful web interface powered by yt-dlp.

## Features ✨

- **Modern UI**: Clean, responsive interface with dark/light theme
- **Real-time Progress**: Live download progress with speed and ETA
- **Multiple Formats**: Support for MP4, MP3, M4A, and more
- **Quality Selection**: Choose from best quality to 480p
- **Batch Management**: Queue multiple downloads
- **File Management**: Open download folder directly
- **Toast Notifications**: Beautiful feedback for all actions

## Tech Stack 🛠️

### Backend

- **Node.js** with Express
- **Socket.IO** for real-time updates
- **yt-dlp** for video downloading
- **Winston** for logging

### Frontend

- **Next.js 15** with React 19
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Prerequisites 📋

- Node.js 18+
- yt-dlp installed and accessible in PATH
- npm or yarn

## Usage 🎯

### Quick Start (Local Script)

```bash
# Windows - Run everything automatically
start-local.bat

# PowerShell alternative
start-local.ps1
```

The **start-local** script automatically:

- Installs all dependencies (backend + frontend)
- Builds the frontend
- Starts both backend and frontend servers
- Opens the application in your browser

### Docker Deployment 🐳

```bash
# Build and start with Docker Compose
docker-start.bat

# Stop containers
docker-remove.bat
```

Docker setup includes:

- Automated container building
- Volume mounting for downloads
- Network configuration
- Environment variable management

### Manual Development Mode

```bash
# Start backend (with auto-reload)
npm run dev

# Start frontend (in another terminal)
cd ui
npm run dev
```

### Production Mode

```bash
# Start the application
npm start
```

The application will be available at:

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8081>

## Configuration ⚙️

Key environment variables in `.env`:

```env
PORT=8081
DOWNLOAD_DIR=./downloads
TEMP_DIR=./downloads/.tmp
OUTPUT_TEMPLATE=%(title)s [%(id)s].%(ext)s
```

## API Endpoints 🔌

- `POST /api/add` - Add new download
- `GET /api/history` - Get download history
- `POST /api/delete` - Delete downloads
- `POST /api/open-folder` - Open file location
- `GET /api/version` - Get version info

## File Structure 📁

```
youtube-vid-flow/
├── src/                 # Backend source
│   ├── models/         # Download models
│   ├── utils/          # Utilities
│   ├── routes.js       # API routes
│   └── server.js       # Main server
├── ui/                 # Frontend (Next.js)
│   ├── app/           # App router
│   ├── components/    # React components
│   └── lib/           # Utilities & hooks
├── downloads/         # Downloaded files
└── .env              # Environment config
```

## Features in Detail 🔍

### Download Management

- Add videos by URL
- Select quality and format
- Real-time progress tracking
- Queue management

### User Interface

- Responsive design
- Dark/light theme toggle
- Toast notifications
- File size and date display

### File Operations

- Automatic filename formatting
- Direct folder access
- Download history
- Batch operations

## Scripts 📜

### NPM Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server
npm run build:ui   # Build frontend
npm test          # Run tests
```

### Batch Scripts (Windows)

```bash
start-local.bat    # Complete local setup and start
start-local.ps1    # PowerShell version of local start
stop-local.bat     # Stop all local processes
docker-start.bat   # Build and start Docker containers
docker-remove.bat  # Stop and remove Docker containers
```

### Script Details

**start-local.bat** performs:

1. Dependency installation (backend + frontend)
2. Frontend build process
3. Concurrent server startup (backend + frontend)
4. Automatic browser opening
5. Process management and cleanup

**docker-start.bat** handles:

1. Docker image building
2. Container orchestration
3. Volume and network setup
4. Service health checks

## Troubleshooting 🔧

### Common Issues

1. **yt-dlp not found**
   - Install yt-dlp: `pip install yt-dlp`
   - Ensure it's in your PATH

2. **Port already in use**
   - Change PORT in `.env`
   - Kill existing processes

3. **Downloads not working**
   - Check yt-dlp version
   - Verify download directory permissions

## Contributing 🤝

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License 📄

AGPL-3.0 License - see LICENSE file for details.

## Version 🏷️

- **Frontend**: v1.0.0
- **Backend**: v1.0.0

---

Made with ❤️ using Node.js and Next.js

**Author**: [Leandro Souza](https://www.linkedin.com/in/leandrolsouza/)
