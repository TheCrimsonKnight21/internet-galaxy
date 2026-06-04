# The Internet Galaxy

An interactive 3D visualization of the internet's ecosystem, where major websites and services are represented as a dynamic galaxy. Explore the interconnected world of tech giants, their services, and how traffic flows across the digital universe.

## 🌌 What is The Internet Galaxy?

The Internet Galaxy transforms abstract web data into an immersive visual experience. Major tech companies are represented as **"suns"** at the center of their own star systems, while their services and products orbit around them as **"planets"**. Website traffic volume is visualized through the size of each celestial body, creating an intuitive representation of internet prominence.

### Key Features

- **Interactive 3D Galaxy**: Navigate through a dynamic universe of websites using an intuitive camera system
- **Search Functionality**: Find specific websites instantly with real-time filtering
- **Category Filtering**: Filter by service type (social media, cloud services, gaming, communication, etc.)
- **Traffic Visualization**: Planet size correlates with website traffic, showing relative importance
- **Orbital Motion**: Watch websites orbit their parent companies, creating a living, breathing ecosystem
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Direct Links**: Double-click (or long-tap on mobile) any website to visit it

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd internet-galaxy

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173` with hot module reloading enabled.

### Build for Production

```bash
npm run build
npm run preview  # Preview the production build locally
```

## 🎮 How to Use

### Desktop Controls

| Action               | Effect                                   |
| -------------------- | ---------------------------------------- |
| **Click**            | Lock/unlock camera on a specific website |
| **Double-click**     | Open website in new tab                  |
| **Drag**             | Rotate and pan the 3D view               |
| **Scroll**           | Zoom in/out                              |
| **Search bar**       | Filter websites by name                  |
| **Category buttons** | Show/hide specific service categories    |
| **Pause button**     | Stop/resume orbital animations           |

### Mobile Controls

| Action         | Effect                   |
| -------------- | ------------------------ |
| **Tap**        | Lock camera on a website |
| **Long tap**   | Open website in new tab  |
| **Drag**       | Rotate the 3D view       |
| **Search bar** | Filter websites by name  |

### UI Elements

- **Search Box**: Filter websites by name in real-time
- **Category Filters**: Toggle visibility of different service categories
- **Controls Panel**: Display current interaction modes
- **Pause Button**: Toggle orbital animations on/off
- **Info Tooltips**: Hover (or tap) to see website details

## 🌍 Data Structure

The application uses JSON data files containing:

### Suns (Tech Giants)

- **Google**: Search, advertising, and tech infrastructure
- **Amazon**: E-commerce, cloud services, and entertainment
- **Microsoft**: Software, productivity, and gaming
- **Meta**: Social networking and communication
- **Apple**: Consumer electronics and digital services

### Planets (Services)

Each planet orbits a sun and includes metadata such as:

- Service name and category
- Traffic volume
- Website link
- Orbital parent

### Categories

Services are organized by type:

- **Tech**: Core technology and software services
- **Cloud**: Cloud computing and storage
- **Media**: Streaming, video, and entertainment
- **Communication**: Messaging and collaboration tools
- **Social**: Social networking platforms
- **Gaming**: Game distribution and platforms
- **Retail**: E-commerce and shopping
- **Tech-Giant**: Major corporations

## 🏗️ Project Structure

```
src/
├── App.tsx                    # Main React component with controls
├── GalaxyCanvas.tsx          # Three.js canvas wrapper
├── App.css                   # Application styling
├── main.tsx                  # Entry point
├── index.css                 # Global styles
├── galaxy/
│   └── renderer.ts           # Three.js 3D rendering engine
└── Data/
    ├── sites.json            # Main dataset (suns and planets)
    ├── new_sites.json        # Extended dataset
    └── Data_Reader.py        # Python utility for data processing
```

## 🛠️ Tech Stack

- **React 19**: UI framework and state management
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Three.js**: 3D graphics and rendering
- **OrbitControls**: Interactive camera control
- **CSS**: Responsive styling

## 📊 Adding New Websites

To add new websites to the galaxy:

1. Edit `src/Data/sites.json`
2. Add new entries to either `"suns"` (parent companies) or `"planets"` (services)
3. Include required fields: `id`, `traffic`, `category`, `x`, `y`, `z`, `link`
4. For planets, add an `"orbits"` field pointing to the parent sun

Example:

```json
{
  "id": "New Service",
  "traffic": 75,
  "category": "tech",
  "x": 5,
  "y": 2,
  "z": 1,
  "link": "https://example.com",
  "orbits": "Google"
}
```

## 🔧 Configuration

### Camera Settings

Edit `src/galaxy/renderer.ts` to adjust:

- Initial camera position
- Zoom limits
- Field of view
- Fog distance

### Visual Styling

Modify `src/App.css` and `src/index.css` to customize:

- UI colors and transparency
- Panel positioning
- Text sizing
- Mobile breakpoints

### Rendering Performance

In `renderer.ts`:

- Adjust planet geometry detail (`PLANET_GEO`)
- Modify orbit speeds
- Change particle effects
- Optimize for performance on lower-end devices

## 📱 Responsive Design

The application automatically adapts to different screen sizes:

- **Desktop (768px+)**: Full controls panel, optimized layout
- **Mobile (<768px)**: Compact UI, touch-friendly buttons, simplified controls

## 🐛 Development

### Linting

```bash
npm run lint
```

### TypeScript Checking

```bash
npm run build  # Runs type checking before building
```

## 📝 Notes

- The application uses **instanced rendering** for optimal 3D performance with many objects
- Orbital mechanics are calculated in real-time based on parent-child relationships
- Search and filtering are done client-side for instant response
- Traffic data determines visual scale (larger traffic = larger planet)

## 🚧 Future Enhancements

Potential features for future versions:

- Real-time traffic data integration
- User-generated galaxy configurations
- Website interaction statistics
- Animated data connections between related services
- Time-travel through internet history
- Custom category definitions
- Export/sharing functionality

## 📄 License

This project is open source. Please check the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Add new websites to the galaxy
- Improve the visualization
- Enhance mobile experience
- Optimize performance
- Report bugs and suggest features

---

**Explore. Visualize. Understand.** The Internet Galaxy awaits.
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
globalIgnores(['dist']),
{
files: ['**/*.{ts,tsx}'],
extends: [
// Other configs...
// Enable lint rules for React
reactX.configs['recommended-typescript'],
// Enable lint rules for React DOM
reactDom.configs.recommended,
],
languageOptions: {
parserOptions: {
project: ['./tsconfig.node.json', './tsconfig.app.json'],
tsconfigRootDir: import.meta.dirname,
},
// other options...
},
},
])

```

```
