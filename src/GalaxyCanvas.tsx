import React, { useEffect, useRef } from 'react';
import { createGalaxy } from './galaxy/renderer';

interface Props {
  searchTerm: string;
  activeCategories: Set<string>;
}

const GalaxyCanvas: React.FC<Props> = ({ searchTerm, activeCategories }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const galaxyRef = useRef<ReturnType<typeof createGalaxy> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    galaxyRef.current = createGalaxy(containerRef.current, searchTerm, activeCategories);

    return () => {
      galaxyRef.current?.dispose();
      galaxyRef.current = null;
    };
  }, []); // Run once on mount

  useEffect(() => {
    galaxyRef.current?.updateFilters(searchTerm, activeCategories);
  }, [searchTerm, activeCategories]);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default GalaxyCanvas;