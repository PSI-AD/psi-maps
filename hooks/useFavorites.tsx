import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const FAVORITES_KEY = 'psi-map-favorites';
const COMPARE_KEY = 'psi-map-compare';

interface FavoritesContextType {
    favoriteIds: string[];
    toggleFavorite: (id: string) => void;
    isFavorite: (id: string) => boolean;
    clearFavorites: () => void;
    favoritesCount: number;
    compareIds: string[];
    toggleCompare: (id: string) => void;
    isInCompare: (id: string) => boolean;
    clearCompare: () => void;
    compareCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const useFavoritesContext = () => {
    const ctx = useContext(FavoritesContext);
    if (!ctx) throw new Error('useFavoritesContext must be used within FavoritesProvider');
    return ctx;
};

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // ── Favorites ──
    const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); }
        catch { return []; }
    });

    useEffect(() => {
        try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds)); } catch { }
    }, [favoriteIds]);

    const toggleFavorite = useCallback((id: string) => {
        setFavoriteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);
    const clearFavorites = useCallback(() => setFavoriteIds([]), []);

    // ── Compare ──
    const [compareIds, setCompareIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]'); }
        catch { return []; }
    });

    useEffect(() => {
        try { localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds)); } catch { }
    }, [compareIds]);

    const toggleCompare = useCallback((id: string) => {
        setCompareIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 3) return prev; // max 3
            return [...prev, id];
        });
    }, []);

    const isInCompare = useCallback((id: string) => compareIds.includes(id), [compareIds]);
    const clearCompare = useCallback(() => setCompareIds([]), []);

    return (
        <FavoritesContext.Provider value= {{
        favoriteIds, toggleFavorite, isFavorite, clearFavorites, favoritesCount: favoriteIds.length,
            compareIds, toggleCompare, isInCompare, clearCompare, compareCount: compareIds.length,
    }
}>
    { children }
    </FavoritesContext.Provider>
  );
};
