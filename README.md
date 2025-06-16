# Drawo - Digital Notebook Application

A modern, feature-rich digital notebook application built with React and Electron, designed for students and professionals who want to combine traditional handwriting with digital convenience.

## ✨ Features

### 📝 Drawing & Note-Taking
- **Smooth Drawing Experience**: Optimized canvas with pressure-sensitive pen support
- **Multiple Drawing Tools**: Pen, eraser, shapes (rectangles), and selection tools
- **Customizable Pen Settings**: Adjustable stroke width, color, and opacity
- **Shape Tools**: Hand-drawn style rectangles with customizable borders and fills

### 🧠 AI-Powered Handwriting Recognition
- **Real-time Handwriting to Text**: Convert your handwritten notes to digital text using AI
- **Spell Checking**: Automatic spell correction for recognized text
- **Customizable Text Formatting**: Font family, size, weight, color, and alignment options
- **Smart Word Boundary Detection**: Automatically detects word boundaries in handwriting

### 📚 Notebook Management
- **Multiple Notebooks**: Create and organize unlimited notebooks
- **Custom Themes**: Choose from 8 beautiful color themes for each notebook
- **Page Navigation**: Easy navigation between pages with visual indicators
- **Auto-save**: Automatic saving of your work

### 🎨 Customizable Canvas
- **Background Patterns**: Grid, dots, lines, graph paper, or blank backgrounds
- **Pattern Customization**: Adjustable size, color, and opacity
- **Zoom & Pan**: Smooth zooming and panning for detailed work
- **Selection Tools**: Select, move, resize, and delete drawn elements

### 💾 Data Management
- **Local Storage**: All data stored locally on your device
- **Cross-Platform**: Available as both web app and desktop app (Electron)
- **Export Options**: Export your drawings as PNG or SVG
- **Data Directory Management**: Choose where to store your notebooks (desktop version)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- For AI features: Python Flask server (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/drawo.git
   cd drawo
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

4. **For desktop app development**
   ```bash
   npm run electron-dev
   # or
   yarn electron-dev
   ```

### Building for Production

**Web Application:**
```bash
npm run build
yarn build
```

**Desktop Application:**
```bash
# For current platform
npm run electron-pack
yarn electron-pack

# For Windows
npm run electron-pack:win
yarn electron-pack:win
```

## 🤖 AI Handwriting Recognition Setup (Optional)

The AI handwriting recognition feature requires a separate Flask server. This is optional but provides enhanced functionality.

1. **Set up the Flask server** (not included in this repository)
   - Install Python dependencies for handwriting recognition
   - Start Flask server on `http://127.0.0.1:5000`

2. **Enable AI features**
   - The app will automatically detect if the Flask server is running
   - Use the AI Handwriting tool (Brain icon) in the toolbar
   - Write naturally and wait 1 second for automatic conversion

## 🎯 How to Use

### Creating Your First Notebook
1. Click the "New Notebook" button
2. Enter a title and description
3. Choose a color theme
4. Set the number of pages
5. Start drawing!

### Drawing Tools
- **Pen Tool (P)**: Draw freehand with customizable settings
- **AI Handwriting Tool (A)**: Write text that gets converted to digital text
- **Eraser Tool (E)**: Remove drawn elements
- **Selection Tool (V)**: Select, move, and resize elements
- **Rectangle Tool (R)**: Draw hand-styled rectangles
- **Pan Tool (H)**: Navigate around large canvases

### Keyboard Shortcuts
- `P` - Pen tool
- `A` - AI Handwriting tool
- `E` - Eraser tool
- `V` - Selection tool
- `R` - Rectangle tool
- `H` - Pan tool
- `Ctrl+S` - Save current page
- `Ctrl+Z` - Undo last action
- `Ctrl+←/→` - Navigate between pages
- `Esc` - Back to notebooks

### Customizing Your Experience
1. **Page Settings** (left panel): Change background patterns and colors
2. **Pen Settings** (right panel): Adjust stroke properties
3. **AI Text Settings** (right panel): Customize converted text appearance
4. **Shape Settings** (right panel): Modify shape properties

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── SmoothCanvas/   # Main drawing canvas
│   ├── ToolBar/        # Top toolbar with tools
│   ├── NotebookCard/   # Notebook display cards
│   ├── AiTextPanel/    # AI text settings panel
│   └── ...
├── stores/             # Zustand state management
│   ├── drawingStore.js # Drawing tools and canvas state
│   ├── noteBookStore.js# Notebook management
│   ├── pageStore.js    # Page data management
│   └── uiStore.js      # UI state management
├── services/           # External services
│   ├── AIProcessingService.js # AI handwriting recognition
│   └── ElectronService.js     # Electron integration
├── pages/              # Main application pages
└── main/               # Electron main process files
```

## 🛠️ Technologies Used

### Frontend
- **React 19**: Modern React with hooks and context
- **Zustand**: Lightweight state management
- **SCSS**: Styled components with modular CSS
- **Lucide React**: Beautiful icons
- **React Router**: Navigation between pages

### Drawing Engine
- **Perfect Freehand**: Smooth pen input handling
- **Rough.js**: Hand-drawn style shapes
- **Canvas API**: High-performance drawing surface

### Desktop Integration
- **Electron**: Cross-platform desktop app
- **IPC**: Secure communication between main and renderer processes
- **File System**: Local data storage and management

### AI Integration
- **Fetch API**: Communication with AI service
- **Custom coordinate conversion**: Optimized data format for AI processing

## 🎓 For Students

This project is perfect for:
- **Digital note-taking** in lectures and study sessions
- **Math and science drawings** with precise tools
- **Mind mapping** and brainstorming
- **Collaborative projects** with export capabilities
- **Learning React, Electron, and modern web development**

### Study Benefits
- Combine handwriting (proven to improve memory) with digital convenience
- Organize notes by subject with multiple notebooks
- Search through AI-converted text
- Never lose your notes with auto-save
- Share notes easily with export features

## 🤝 Contributing

This is a student project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is created for educational purposes. Please check with your institution's policies regarding code sharing and collaboration.

## 🙏 Acknowledgments

- Built as a learning project to understand modern web development
- Inspired by the need for better digital note-taking tools for students
- Thanks to the open-source community for the amazing libraries used

## 📞 Support

If you're a fellow student working on this project or have questions:
- Open an issue for bug reports
- Check the documentation for common problems
- Review the code comments for implementation details

---

**Happy note-taking! 📚✨**

*Remember: The best way to learn is by building. This project demonstrates modern React patterns, state management, canvas manipulation, AI integration, and desktop app development - all valuable skills for any developer.*
