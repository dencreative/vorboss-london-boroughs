# London Boroughs Map Viewer

An interactive web application for visualizing and exploring London boroughs with detailed geographic data and borough information.

## 🗺️ Features

- **Interactive Map**: Explore London boroughs with an intuitive map interface
- **Borough Search**: Search and autocomplete functionality to quickly find specific boroughs
- **Detailed Borough Information**: Click on boroughs to view detailed information and statistics
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Map Controls**: Zoom in/out and navigate the map with built-in controls
- **Borough Cards View**: Alternative card-based view for browsing all boroughs
- **Coverage Visualization**: Visual representation of borough boundaries and coverage areas

## 🏗️ Project Structure

```
vorboss-london-boroughs/
├── styles.css              # Main stylesheet with design system and component styles
├── map-viewer.min.js        # Minified JavaScript for map functionality
├── all_coverage_new.json    # GeoJSON data containing London borough boundaries
└── README.md               # This file
```

## 🎨 Design System

The project includes a comprehensive design system with:

- **Color Palette**: Primary colors, borough-specific colors, and grayscale variants
- **Typography Scale**: Consistent font sizes and weights
- **Spacing System**: Standardized spacing values for consistent layouts
- **Component Library**: Reusable UI components (buttons, cards, controls)
- **Responsive Breakpoints**: Mobile-first responsive design

## 🚀 Getting Started

### Prerequisites

- A modern web browser with JavaScript enabled
- Local web server (for development)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vorboss-london-boroughs
   ```

2. Serve the files using a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Or use any other local server
   ```

3. Open your browser and navigate to `http://localhost:8000`

## 📱 Usage

### Map View
- **Navigate**: Click and drag to pan around the map
- **Zoom**: Use the zoom controls or mouse wheel to zoom in/out
- **Select Borough**: Click on any borough to view detailed information
- **Search**: Use the search bar to quickly find specific boroughs

### Borough Information
- Click on any borough to open the information sidebar
- View detailed statistics and information about the selected borough
- Use the reset button to clear selection and return to the full map view

### Search Functionality
- Type in the search bar to see autocomplete suggestions
- Search by postcode, area name, or borough name
- Click on any suggestion to navigate to that location

## 🎯 Key Components

### Map Interface
- Interactive borough boundaries with hover effects
- Zoom controls and map legend
- Loading states and error handling

### Search System
- Real-time autocomplete suggestions
- Multiple search criteria (postcode, area, borough)
- Clear and intuitive search interface

### Borough Details
- Comprehensive borough information display
- Rich text content support
- External links and additional resources

## 🔧 Customization

The design system uses CSS custom properties, making it easy to customize:

```css
:root {
  --lbm-color-primary: #3B82F6;        /* Primary brand color */
  --lbm-borough-base: rgba(216, 180, 254, 0.6);  /* Borough fill color */
  --lbm-borough-hover: rgba(147, 51, 234, 0.8);  /* Borough hover color */
  /* ... more custom properties */
}
```

## 📊 Data Format

The application uses GeoJSON format for borough boundary data:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "borough-name",
      "properties": {
        "NAME": "Borough Name"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      }
    }
  ]
}
```

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions, please open an issue in the repository.

---

**Note**: This is a web-based visualization tool for London borough data. Make sure to serve the files through a web server rather than opening them directly in a browser to ensure proper functionality. 