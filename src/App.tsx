import  { useState} from 'react';
import sitesData from "./Data/sites.json";
import GalaxyCanvas from './GalaxyCanvas';
import './App.css';

const categories: string[] = [];
sitesData.planets.forEach(p => {
  if (!categories.includes(p.category)){
  categories.push(p.category)
  }
  
})

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setActiveCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cat)) newSet.delete(cat);
      else newSet.add(cat);
      return newSet;
    });
  };

  const clearFilters = () => {
    setActiveCategories(new Set());
    setSearchTerm('');
  };

  return (
    <div className="app">
      <GalaxyCanvas
        searchTerm={searchTerm}
        activeCategories={activeCategories}
      />
      
      {/* UI Overlay - positioned absolutely over the canvas */}
      <div className="ui-overlay">
        <div className="controls">
          <input
            type="text"
            placeholder="Search planets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={clearFilters} className="clear-btn">
            Clear Filters
          </button>
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`category-btn ${activeCategories.has(cat) ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;