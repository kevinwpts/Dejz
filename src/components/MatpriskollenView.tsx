import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Storefront,
  MagnifyingGlass,
  NavigationArrow,
  ArrowsClockwise,
  CaretRight,
  CaretLeft,
  Tag,
  Compass,
  Plus,
  Minus,
  CornersOut,
  CornersIn,
  X,
  Info,
} from '@phosphor-icons/react';
import { ItemLogo } from './ItemLogo';
import { BottomSheet } from './ui/BottomSheet';

interface MpkStore {
  id: number | string;
  key: string;
  name: string;
  chainName: string;
  offerCount: number;
  imageUrl?: string;
  dist?: string;
  lat: number;
  lon: number;
}

interface MpkOffer {
  id: number | string;
  key: string;
  condition?: string;
  description?: string;
  price: string;
  comprice?: string;
  regular?: string;
  volume?: string;
  requiresMembershipCard?: boolean;
  store_key?: string;
  storeKey?: string;
  storeName?: string;
  chainName?: string;
  storeLogo?: string;
  storeDist?: string;
  storeLat?: number;
  storeLon?: number;
  product?: {
    name: string;
    brand?: string;
    origin?: string;
    categories?: Array<{
      name: string;
      parent_category?: { name: string };
    }>;
  };
  produkt_bild_urls?: {
    bildUrl?: string;
    thumbnailUrl?: string;
  };
}

const SWEDISH_CITIES: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Helsingborg', lat: 56.0465, lon: 12.6945 },
  { name: 'Stockholm', lat: 59.3293, lon: 18.0686 },
  { name: 'Göteborg', lat: 57.7089, lon: 11.9746 },
  { name: 'Malmö', lat: 55.605, lon: 13.0038 },
  { name: 'Uppsala', lat: 59.8586, lon: 17.6389 },
  { name: 'Linköping', lat: 58.4108, lon: 15.6214 },
  { name: 'Örebro', lat: 59.2753, lon: 15.2134 },
  { name: 'Västerås', lat: 59.6099, lon: 16.5448 },
];

const CHAIN_FILTERS = ['Alla', 'ICA', 'Willys', 'Coop', 'Lidl', 'Hemköp', 'City Gross', 'Tempo'];

const POPULAR_SEARCH_ITEMS = [
  'Kaffe',
  'Smör',
  'Kyckling',
  'Nötfärs',
  'Mjölk',
  'Ost',
  'Ägg',
  'Bröd',
  'Läsk',
];

function parseOfferUnitPrice(priceStr?: string, conditionStr?: string): number {
  if (!priceStr) return 999999;
  const cleaned = priceStr.replace(/\s+/g, ' ').replace(',', '.');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 999999;
  const rawVal = parseFloat(match[1]);
  if (!Number.isFinite(rawVal) || rawVal <= 0) return 999999;

  // Handle multi-buy conditions like "2 för", "3 för" when price isn't already "/st"
  if (conditionStr && !/\/st/i.test(cleaned)) {
    const multiMatch = conditionStr.match(/(\d+)\s*för/i);
    if (multiMatch) {
      const qty = parseInt(multiMatch[1], 10);
      if (qty > 1 && rawVal > qty * 3) {
        return rawVal / qty;
      }
    }
  }
  return rawVal;
}

function parseOfferComprice(compriceStr?: string): number {
  if (!compriceStr) return 999999;
  const cleaned = compriceStr.replace(/\s+/g, ' ').replace(',', '.');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 999999;
  const val = parseFloat(match[1]);
  return Number.isFinite(val) && val > 0 ? val : 999999;
}

/**
 * Separates short price conditions (e.g. "2 för", "Max 2 köp") that fit above the price badge
 * from long condition/exclusion texts (e.g. "Gäller ej Perio Gard, Sensitive Repair...")
 */
function splitOfferTexts(offer: MpkOffer): {
  shortBadgeCondition?: string;
  longNoticeText?: string;
} {
  const rawCond = (offer.condition || '').trim();
  const rawDesc = (offer.description || '').trim();

  const isShortCond = rawCond.length > 0 && rawCond.length <= 15;
  const shortBadgeCondition = isShortCond ? rawCond : undefined;

  const notices: string[] = [];
  if (rawCond && !isShortCond) {
    notices.push(rawCond);
  }
  if (rawDesc && rawDesc.toLowerCase() !== rawCond.toLowerCase()) {
    notices.push(rawDesc);
  }

  return {
    shortBadgeCondition,
    longNoticeText: notices.length > 0 ? notices.join(' · ') : undefined,
  };
}

function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function latToTileY(lat: number, zoom: number): number {
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const rad = (clampedLat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
}

function tileXToLon(tileX: number, zoom: number): number {
  return (tileX / Math.pow(2, zoom)) * 360 - 180;
}

function tileYToLat(tileY: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * tileY) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const MatpriskollenView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stores' | 'deals'>('stores');
  const [coords, setCoords] = useState<{ lat: number; lon: number; label: string }>({
    lat: 56.0465,
    lon: 12.6945,
    label: 'Helsingborg',
  });

  // Voi-style interactive map state (independent pan/zoom camera)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number }>({
    lat: 56.0465,
    lon: 12.6945,
  });
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [previewStore, setPreviewStore] = useState<MpkStore | null>(null);
  const [isDraggingMap, setIsDraggingMap] = useState<boolean>(false);
  const [locatingGps, setLocatingGps] = useState(false);

  const [stores, setStores] = useState<MpkStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string>('Alla');
  const [storeSearch, setStoreSearch] = useState('');

  const [selectedStore, setSelectedStore] = useState<MpkStore | null>(null);
  const [storeOffers, setStoreOffers] = useState<MpkOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offerSearch, setOfferSearch] = useState('');
  const [selectedOfferCategory, setSelectedOfferCategory] = useState<string>('Alla');
  const [dealSortBy, setDealSortBy] = useState<'price' | 'comprice' | 'distance'>('price');

  const [multiStoreOffers, setMultiStoreOffers] = useState<MpkOffer[]>([]);
  const [loadingMultiOffers, setLoadingMultiOffers] = useState(false);
  const [selectedOfferDetail, setSelectedOfferDetail] = useState<MpkOffer | null>(null);

  // Refs for smooth touch/mouse pan & pinch-to-zoom
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startCenterTileX: number;
    startCenterTileY: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startCenterTileX: 0,
    startCenterTileY: 0,
    moved: false,
  });
  const pinchStateRef = useRef<{
    active: boolean;
    initialDistance: number;
    initialZoom: number;
  }>({
    active: false,
    initialDistance: 0,
    initialZoom: 13,
  });
  const lastTapTimeRef = useRef<number>(0);

  const fetchStores = async (lat: number, lon: number) => {
    setLoadingStores(true);
    try {
      const res = await fetch(`/api/matpriskollen/stores?lat=${lat}&lon=${lon}&limit=35`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const valid: MpkStore[] = (Array.isArray(data) ? data : [])
        .filter((s: any) => s && s.name && typeof s.lat === 'number' && typeof s.lon === 'number')
        .map((s: any) => ({
          id: s.id,
          key: String(s.key || s.id),
          name: String(s.name),
          chainName: String(s.chainName || ''),
          offerCount: Number(s.offerCount) || 0,
          imageUrl: s.imageUrl || undefined,
          dist: s.dist ? String(s.dist) : undefined,
          lat: Number(s.lat),
          lon: Number(s.lon),
        }));
      setStores(valid);
    } catch {
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  const fetchNearbyOffers = async (lat: number, lon: number) => {
    setLoadingMultiOffers(true);
    try {
      const res = await fetch(`/api/matpriskollen/nearby-offers?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const raw = Array.isArray(data?.offers) ? data.offers : [];
      setMultiStoreOffers(raw);
    } catch {
      setMultiStoreOffers([]);
    } finally {
      setLoadingMultiOffers(false);
    }
  };

  const fetchOffersForStore = async (store: MpkStore) => {
    setSelectedStore(store);
    setSelectedOfferCategory('Alla');
    setLoadingOffers(true);
    try {
      const res = await fetch(
        `/api/matpriskollen/stores/${encodeURIComponent(store.key)}/offers?lat=${coords.lat}&lon=${coords.lon}&limit=100`
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const rawOffers = Array.isArray(data?.offers) ? data.offers : [];
      setStoreOffers(
        rawOffers.map((o: any) => ({
          ...o,
          storeKey: store.key,
          storeName: store.name,
          chainName: store.chainName,
          storeLogo: store.imageUrl,
          storeDist: store.dist,
        }))
      );
    } catch {
      setStoreOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    fetchStores(coords.lat, coords.lon);
    fetchNearbyOffers(coords.lat, coords.lon);
  }, []);

  // Attach non-passive wheel listener on map container so wheel zoom doesn't scroll page
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 1 : -1;
      setMapZoom((z) => Math.max(9, Math.min(17, z + delta)));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [activeSubTab, selectedStore]);

  const requestUserLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: 'Din plats',
        };
        setCoords(next);
        setMapCenter({ lat: next.lat, lon: next.lon });
        setMapZoom(13);
        setPreviewStore(null);
        setSelectedStore(null);
        setLocatingGps(false);
        fetchStores(next.lat, next.lon);
        fetchNearbyOffers(next.lat, next.lon);
      },
      () => {
        setLocatingGps(false);
      },
      { enableHighAccuracy: false, timeout: 7000 }
    );
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startCenterTileX: lonToTileX(mapCenter.lon, mapZoom),
      startCenterTileY: latToTileY(mapCenter.lat, mapZoom),
      moved: false,
    };
    setIsDraggingMap(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStateRef.current.moved = true;
    }
    const nextTileX = dragStateRef.current.startCenterTileX - dx / 256;
    const nextTileY = dragStateRef.current.startCenterTileY - dy / 256;
    setMapCenter({
      lat: Math.max(-80, Math.min(80, tileYToLat(nextTileY, mapZoom))),
      lon: Math.max(-179, Math.min(179, tileXToLon(nextTileX, mapZoom))),
    });
  };

  const handleMouseUp = () => {
    dragStateRef.current.active = false;
    setIsDraggingMap(false);
  };

  // Touch pan & pinch-to-zoom handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      dragStateRef.current.active = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStateRef.current = {
        active: true,
        initialDistance: Math.hypot(dx, dy) || 1,
        initialZoom: mapZoom,
      };
      return;
    }

    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 280) {
        setMapZoom((z) => Math.min(17, z + 1));
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      const t = e.touches[0];
      dragStateRef.current = {
        active: true,
        startX: t.clientX,
        startY: t.clientY,
        startCenterTileX: lonToTileX(mapCenter.lon, mapZoom),
        startCenterTileY: latToTileY(mapCenter.lat, mapZoom),
        moved: false,
      };
      setIsDraggingMap(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStateRef.current.active) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStateRef.current.initialDistance;
      const zoomDelta = Math.round(Math.log2(ratio) * 1.4);
      const nextZoom = Math.max(
        9,
        Math.min(17, pinchStateRef.current.initialZoom + zoomDelta)
      );
      if (nextZoom !== mapZoom) {
        setMapZoom(nextZoom);
      }
      return;
    }

    if (e.touches.length === 1 && dragStateRef.current.active) {
      const t = e.touches[0];
      const dx = t.clientX - dragStateRef.current.startX;
      const dy = t.clientY - dragStateRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragStateRef.current.moved = true;
      }
      const nextTileX = dragStateRef.current.startCenterTileX - dx / 256;
      const nextTileY = dragStateRef.current.startCenterTileY - dy / 256;
      setMapCenter({
        lat: Math.max(-80, Math.min(80, tileYToLat(nextTileY, mapZoom))),
        lon: Math.max(-179, Math.min(179, tileXToLon(nextTileX, mapZoom))),
      });
    }
  };

  const handleTouchEnd = () => {
    dragStateRef.current.active = false;
    pinchStateRef.current.active = false;
    setIsDraggingMap(false);
  };

  const hasPannedAway = useMemo(() => {
    return distanceKm(coords.lat, coords.lon, mapCenter.lat, mapCenter.lon) > 0.75;
  }, [coords, mapCenter]);

  const handleSearchThisArea = () => {
    const next = {
      lat: mapCenter.lat,
      lon: mapCenter.lon,
      label: 'Valt kartområde',
    };
    setCoords(next);
    setPreviewStore(null);
    fetchStores(next.lat, next.lon);
    fetchNearbyOffers(next.lat, next.lon);
  };

  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      if (selectedChain !== 'Alla') {
        const matchChain =
          s.chainName.toLowerCase().includes(selectedChain.toLowerCase()) ||
          s.name.toLowerCase().includes(selectedChain.toLowerCase());
        if (!matchChain) return false;
      }
      if (storeSearch.trim()) {
        const q = storeSearch.toLowerCase().trim();
        return (
          s.name.toLowerCase().includes(q) || s.chainName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stores, selectedChain, storeSearch]);

  const offerCategories = useMemo(() => {
    const activeList = selectedStore ? storeOffers : multiStoreOffers;
    const set = new Set<string>();
    for (const o of activeList) {
      const parentCat = o.product?.categories?.[0]?.parent_category?.name;
      const cat = parentCat || o.product?.categories?.[0]?.name;
      if (cat) set.add(cat);
    }
    return ['Alla', ...Array.from(set)];
  }, [selectedStore, storeOffers, multiStoreOffers]);

  // Filtered AND price-sorted offers (Billigast i närheten först!)
  const filteredOffers = useMemo(() => {
    const activeList = selectedStore ? storeOffers : multiStoreOffers;
    const matches = activeList.filter((o) => {
      if (!selectedStore && selectedChain !== 'Alla') {
        const matchChain =
          (o.chainName || '').toLowerCase().includes(selectedChain.toLowerCase()) ||
          (o.storeName || '').toLowerCase().includes(selectedChain.toLowerCase());
        if (!matchChain) return false;
      }
      if (selectedOfferCategory !== 'Alla') {
        const parentCat = o.product?.categories?.[0]?.parent_category?.name;
        const cat = parentCat || o.product?.categories?.[0]?.name;
        if (cat !== selectedOfferCategory) return false;
      }
      if (offerSearch.trim()) {
        const q = offerSearch.toLowerCase().trim();
        const pName = (o.product?.name || '').toLowerCase();
        const brand = (o.product?.brand || '').toLowerCase();
        const desc = (o.description || '').toLowerCase();
        const catName = (o.product?.categories?.[0]?.name || '').toLowerCase();
        return (
          pName.includes(q) ||
          brand.includes(q) ||
          desc.includes(q) ||
          catName.includes(q)
        );
      }
      return true;
    });

    // Sort by lowest price, lowest comparison price, or closest store distance
    return [...matches].sort((a, b) => {
      if (dealSortBy === 'comprice') {
        const ca = parseOfferComprice(a.comprice);
        const cb = parseOfferComprice(b.comprice);
        if (ca !== cb) return ca - cb;
      }
      if (dealSortBy === 'distance') {
        const da = parseFloat(String(a.storeDist || '999').replace(',', '.')) || 999;
        const db = parseFloat(String(b.storeDist || '999').replace(',', '.')) || 999;
        if (da !== db) return da - db;
      }
      const pa = parseOfferUnitPrice(a.price, a.condition);
      const pb = parseOfferUnitPrice(b.price, b.condition);
      if (pa !== pb) return pa - pb;
      const da = parseFloat(String(a.storeDist || '999').replace(',', '.')) || 999;
      const db = parseFloat(String(b.storeDist || '999').replace(',', '.')) || 999;
      return da - db;
    });
  }, [
    selectedStore,
    storeOffers,
    multiStoreOffers,
    selectedChain,
    selectedOfferCategory,
    offerSearch,
    dealSortBy,
  ]);

  // Map from storeKey -> cheapest matching offer when user searches for a product!
  const cheapestOfferByStoreKey = useMemo(() => {
    const map = new Map<string, MpkOffer>();
    if (!offerSearch.trim()) return map;
    for (const offer of filteredOffers) {
      const sKey = offer.storeKey || offer.store_key;
      if (!sKey) continue;
      if (!map.has(sKey)) {
        map.set(sKey, offer);
      }
    }
    return map;
  }, [filteredOffers, offerSearch]);

  // 5x5 Retina Slippy Map calculation (1280x1280px seamless coverage for Voi-style dragging)
  const mapRenderData = useMemo(() => {
    const centerTileX = lonToTileX(mapCenter.lon, mapZoom);
    const centerTileY = latToTileY(mapCenter.lat, mapZoom);
    const baseTileX = Math.floor(centerTileX);
    const baseTileY = Math.floor(centerTileY);
    const offsetX = (centerTileX - baseTileX) * 256;
    const offsetY = (centerTileY - baseTileY) * 256;
    const maxTile = Math.pow(2, mapZoom);

    const tiles: Array<{ key: string; lightUrl: string; darkUrl: string; dx: number; dy: number }> = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = ((baseTileX + dx) % maxTile + maxTile) % maxTile;
        const ty = baseTileY + dy;
        if (ty < 0 || ty >= maxTile) continue;
        tiles.push({
          key: `${mapZoom}-${tx}-${ty}`,
          lightUrl: `https://basemaps.cartocdn.com/rastertiles/voyager/${mapZoom}/${tx}/${ty}@2x.png`,
          darkUrl: `https://basemaps.cartocdn.com/dark_all/${mapZoom}/${tx}/${ty}@2x.png`,
          dx: dx * 256 - offsetX,
          dy: dy * 256 - offsetY,
        });
      }
    }

    const pins = filteredStores.slice(0, 30).map((store) => {
      const sx = (lonToTileX(store.lon, mapZoom) - centerTileX) * 256;
      const sy = (latToTileY(store.lat, mapZoom) - centerTileY) * 256;
      return {
        store,
        sx,
        sy,
      };
    });

    const originX = (lonToTileX(coords.lon, mapZoom) - centerTileX) * 256;
    const originY = (latToTileY(coords.lat, mapZoom) - centerTileY) * 256;

    return { tiles, pins, originX, originY };
  }, [mapCenter, mapZoom, filteredStores, coords]);

  // ====================================================================
  // DETALJVY FÖR VALD BUTIK (ALLA ERBJUDANDEN FRÅN MATPRISKOLLEN)
  // ====================================================================
  if (selectedStore) {
    return (
      <div className="ui-page animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedStore(null)}
            className="px-3.5 py-2 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <CaretLeft size={14} weight="bold" />
            <span>Tillbaka till butiker</span>
          </button>

          {selectedStore.dist && (
            <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums">
              {selectedStore.dist} km bort
            </span>
          )}
        </div>

        {/* Butikshuvud */}
        <section className="ui-card-p flex items-center gap-3.5">
          <ItemLogo
            name={selectedStore.name}
            category="Mat & dryck"
            logoUrl={selectedStore.imageUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-base text-[var(--text-primary)] truncate">
              {selectedStore.name}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {storeOffers.length > 0
                ? `${storeOffers.length} aktuella erbjudanden via Matpriskollen`
                : `${selectedStore.offerCount} erbjudanden denna vecka`}
            </p>
          </div>
        </section>

        {/* Sök & kategorier i butiken */}
        <div className="space-y-2.5">
          <div className="relative">
            <MagnifyingGlass
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={offerSearch}
              onChange={(e) => setOfferSearch(e.target.value)}
              placeholder={`Sök billiga varor hos ${selectedStore.name}...`}
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[12.5px] font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            />
            {offerSearch && (
              <button
                type="button"
                onClick={() => setOfferSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          {offerCategories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {offerCategories.map((cat) => {
                const active = selectedOfferCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedOfferCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 transition-all cursor-pointer ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                        : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Erbjudandelista */}
        <section className="ui-list-card">
          {loadingOffers ? (
            <div className="py-10 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
              <ArrowsClockwise size={15} className="animate-spin" />
              <span>Hämtar veckans erbjudanden...</span>
            </div>
          ) : filteredOffers.length > 0 ? (
            filteredOffers.map((offer, idx) => {
              const imgUrl =
                offer.produkt_bild_urls?.thumbnailUrl || offer.produkt_bild_urls?.bildUrl;
              const prodName = offer.product?.name || 'Vara';
              const brand = offer.product?.brand;
              const volume = offer.volume;
              const { shortBadgeCondition, longNoticeText } = splitOfferTexts(offer);
              const metaParts = [brand, volume].filter(Boolean);

              return (
                <button
                  key={`${offer.key || offer.id}-${idx}`}
                  type="button"
                  onClick={() => setSelectedOfferDetail(offer)}
                  className="w-full py-3 flex items-start justify-between gap-3 text-left hover:opacity-85 transition-opacity cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-white border border-[var(--border-subtle)] p-1 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={prodName}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <Tag size={16} className="text-emerald-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title block truncate">{prodName}</span>
                      <span className="ui-row-subtitle block truncate">
                        {metaParts.length > 0 ? metaParts.join(' · ') : 'Veckans extrapris'}
                      </span>
                      {offer.comprice && (
                        <span className="text-[10.5px] text-[var(--text-muted)] block mt-0.5 tabular-nums truncate">
                          Jmf-pris {offer.comprice}
                          {offer.regular ? ` · Ord. ${offer.regular}` : ''}
                        </span>
                      )}
                      {longNoticeText && (
                        <span className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-1 break-words flex items-center gap-1">
                          <Info size={11} className="text-[var(--text-muted)] shrink-0" />
                          <span className="truncate">{longNoticeText}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 max-w-[104px] flex flex-col items-end">
                    {shortBadgeCondition && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-0.5 truncate max-w-full">
                        {shortBadgeCondition}
                      </span>
                    )}
                    <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-display font-bold text-xs tabular-nums whitespace-nowrap">
                      {offer.price}
                    </span>
                    {offer.requiresMembershipCard && (
                      <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                        Medlemspris
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-10 text-center">
              <Tag size={32} weight="light" className="ui-empty-icon mb-1.5" />
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Inga erbjudanden matchade din sökning
              </p>
            </div>
          )}
        </section>

        {/* BottomSheet för erbjudandedetalj & långa villkorstexter */}
        <BottomSheet
          isOpen={!!selectedOfferDetail}
          onClose={() => setSelectedOfferDetail(null)}
          maxWidthClass="max-w-md"
        >
          {selectedOfferDetail && (() => {
            const detailImg =
              selectedOfferDetail.produkt_bild_urls?.bildUrl ||
              selectedOfferDetail.produkt_bild_urls?.thumbnailUrl;
            const detailName = selectedOfferDetail.product?.name || 'Erbjudande';
            const { shortBadgeCondition, longNoticeText } = splitOfferTexts(selectedOfferDetail);
            const rawCond = (selectedOfferDetail.condition || '').trim();
            const rawDesc = (selectedOfferDetail.description || '').trim();

            return (
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-[var(--border-subtle)] p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                      {detailImg ? (
                        <img
                          src={detailImg}
                          alt={detailName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Tag size={24} className="text-emerald-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-base text-[var(--text-primary)] leading-snug break-words">
                        {detailName}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 break-words">
                        {[
                          selectedOfferDetail.product?.brand,
                          selectedOfferDetail.volume,
                          selectedOfferDetail.product?.origin,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Extrapris'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOfferDetail(null)}
                    className="ui-icon-btn shrink-0"
                    aria-label="Stäng"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>

                {/* Pris & villkorskort */}
                <div className="rounded-xl bg-[var(--bg-color)]/60 border border-[var(--border-subtle)] p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)] block">Kampanjpris</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      {shortBadgeCondition && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {shortBadgeCondition}
                        </span>
                      )}
                      <span className="font-display font-bold text-lg text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {selectedOfferDetail.price}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[var(--text-secondary)] space-y-0.5">
                    {selectedOfferDetail.comprice && (
                      <div className="tabular-nums">Jmf-pris: {selectedOfferDetail.comprice}</div>
                    )}
                    {selectedOfferDetail.regular && (
                      <div className="text-[var(--text-muted)] tabular-nums">
                        Ord. pris: {selectedOfferDetail.regular}
                      </div>
                    )}
                    {selectedOfferDetail.requiresMembershipCard && (
                      <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Kräver medlemskap
                      </div>
                    )}
                  </div>
                </div>

                {/* Fullständig villkors- eller beskrivningstext (t.ex. "Gäller ej Perio Gard...") */}
                {(longNoticeText || rawDesc || rawCond) && (
                  <div className="rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-3.5 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                      Villkor & produktinformation
                    </span>
                    {rawCond && (
                      <p className="text-[13px] text-[var(--text-primary)] leading-relaxed break-words">
                        {rawCond}
                      </p>
                    )}
                    {rawDesc && rawDesc.toLowerCase() !== rawCond.toLowerCase() && (
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed break-words">
                        {rawDesc}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </BottomSheet>
      </div>
    );
  }

  // Helper to open a store from an offer click
  const handleSelectOfferStore = (offer: MpkOffer) => {
    const sKey = offer.storeKey || offer.store_key;
    const found = stores.find(
      (s) => s.key === sKey || s.name.toLowerCase() === (offer.storeName || '').toLowerCase()
    );
    if (found) {
      fetchOffersForStore(found);
    }
  };

  // ====================================================================
  // HUVUDVY: VOI-LIKNANDE INTERAKTIV KARTA & SÖK BILLIGASTE VARA NÄRA DIG
  // ====================================================================
  return (
    <div className="ui-page animate-fade-in">
      {/* Segmented Switch */}
      <div className="ui-segment">
        <button
          type="button"
          onClick={() => setActiveSubTab('stores')}
          className={`flex-1 flex items-center justify-center gap-1.5 ${
            activeSubTab === 'stores' ? 'ui-segment-btn-active' : 'ui-segment-btn-idle'
          }`}
        >
          <Storefront size={13} weight={activeSubTab === 'stores' ? 'fill' : 'regular'} />
          <span>Butiker</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('deals')}
          className={`flex-1 flex items-center justify-center gap-1.5 ${
            activeSubTab === 'deals' ? 'ui-segment-btn-active' : 'ui-segment-btn-idle'
          }`}
        >
          <Tag size={13} weight={activeSubTab === 'deals' ? 'fill' : 'regular'} />
          <span>Hitta billigaste vara</span>
        </button>
      </div>

      {/* Plats- & stadsväljare */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={requestUserLocation}
          className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            coords.label === 'Din plats'
              ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
              : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <NavigationArrow size={12} weight="fill" className={locatingGps ? 'animate-spin' : ''} />
          <span>{locatingGps ? 'Hämtar plats...' : 'Nära mig'}</span>
        </button>

        {SWEDISH_CITIES.map((city) => {
          const isSelected = coords.label === city.name;
          return (
            <button
              key={city.name}
              type="button"
              onClick={() => {
                setCoords({ lat: city.lat, lon: city.lon, label: city.name });
                setMapCenter({ lat: city.lat, lon: city.lon });
                setMapZoom(13);
                setPreviewStore(null);
                fetchStores(city.lat, city.lon);
                fetchNearbyOffers(city.lat, city.lon);
              }}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                  : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      {/* ALLTID SYNLIG VARUSÖK: Sök på en vara och få upp billigaste i närheten direkt */}
      <div className="space-y-2">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="text"
            value={offerSearch}
            onChange={(e) => setOfferSearch(e.target.value)}
            placeholder={`Sök vara (t.ex. Kaffe, Smör, Kyckling) – se billigast nära ${coords.label}...`}
            className="w-full pl-10 pr-9 py-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] shadow-subtle text-[13px] font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
          />
          {offerSearch && (
            <button
              type="button"
              onClick={() => setOfferSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--bg-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={12} weight="bold" />
            </button>
          )}
        </div>

        {/* Snabbchips för vanliga basvaror */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {POPULAR_SEARCH_ITEMS.map((item) => {
            const isSelected = offerSearch.toLowerCase().trim() === item.toLowerCase();
            return (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setOfferSearch(isSelected ? '' : item)
                }
                className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Om användaren har sökt på en vara i Kart-fliken: Visa direkt "Billigast i närheten" överst */}
      {activeSubTab === 'stores' && offerSearch.trim() !== '' && (
        <section className="ui-card-p space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold text-[13.5px] text-[var(--text-primary)]">
                Billigast för &ldquo;{offerSearch.trim()}&rdquo; nära {coords.label}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Sorterat efter lägst pris i närliggande butiker
              </p>
            </div>
            {filteredOffers.length > 4 && (
              <button
                type="button"
                onClick={() => setActiveSubTab('deals')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 cursor-pointer"
              >
                Visa alla ({filteredOffers.length})
              </button>
            )}
          </div>

          {loadingMultiOffers ? (
            <div className="py-6 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
              <ArrowsClockwise size={14} className="animate-spin" />
              <span>Jämför priser i butiker nära dig...</span>
            </div>
          ) : filteredOffers.length > 0 ? (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filteredOffers.slice(0, 4).map((offer, idx) => {
                const imgUrl =
                  offer.produkt_bild_urls?.thumbnailUrl || offer.produkt_bild_urls?.bildUrl;
                const prodName = offer.product?.name || 'Vara';
                const isCheapest = idx === 0;
                const { shortBadgeCondition, longNoticeText } = splitOfferTexts(offer);

                return (
                  <button
                    key={`quick-deal-${offer.key || offer.id}-${idx}`}
                    type="button"
                    onClick={() => setSelectedOfferDetail(offer)}
                    className="w-full py-2.5 flex items-start justify-between gap-3 text-left hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[var(--border-subtle)] p-1 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={prodName}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <Tag size={15} className="text-emerald-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isCheapest && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9.5px] font-bold uppercase tracking-wide shrink-0">
                              Billigast
                            </span>
                          )}
                          <span className="ui-row-title truncate">{prodName}</span>
                        </div>
                        <span className="ui-row-subtitle block truncate">
                          {[
                            offer.storeName,
                            offer.storeDist ? `${offer.storeDist} km` : undefined,
                            offer.product?.brand,
                            offer.volume,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {longNoticeText && (
                          <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1 break-words flex items-center gap-1">
                            <Info size={11} className="text-[var(--text-muted)] shrink-0" />
                            <span className="truncate">{longNoticeText}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 max-w-[104px] flex flex-col items-end">
                      {shortBadgeCondition && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate max-w-full">
                          {shortBadgeCondition}
                        </span>
                      )}
                      <span
                        className={`inline-block px-2.5 py-1 rounded-xl font-display font-bold text-xs tabular-nums whitespace-nowrap ${
                          isCheapest
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {offer.price}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="py-3 text-xs text-[var(--text-muted)] text-center">
              Inga extrapriser på &ldquo;{offerSearch.trim()}&rdquo; i närliggande butiker just nu.
            </p>
          )}
        </section>
      )}

      {activeSubTab === 'stores' ? (
        <>
          {/* Kedjefilter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {CHAIN_FILTERS.map((chain) => {
              const active = selectedChain === chain;
              return (
                <button
                  key={chain}
                  type="button"
                  onClick={() => setSelectedChain(chain)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                      : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {chain === 'Alla' ? 'Alla butiker' : chain}
                </button>
              );
            })}
          </div>

          {/* Lista med butiker i närheten */}
          <section className="ui-section">
            <div className="ui-section-header">
              <h2 className="ui-section-title">
                Butiker nära {coords.label} ({filteredStores.length})
              </h2>
              <span className="text-[11px] text-[var(--text-muted)]">Matpriskollen</span>
            </div>

            <div className="relative mb-2">
              <MagnifyingGlass
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="text"
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Filtrera butiksnamn (t.ex. ICA Maxi, Willys, Coop)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[12.5px] font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>

            <div className="ui-list-card">
              {loadingStores ? (
                <div className="py-10 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <ArrowsClockwise size={15} className="animate-spin" />
                  <span>Hämtar butiker från Matpriskollen...</span>
                </div>
              ) : filteredStores.length > 0 ? (
                filteredStores.map((store) => (
                  <button
                    key={store.key}
                    type="button"
                    onClick={() => fetchOffersForStore(store)}
                    className="ui-tx-row"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ItemLogo
                        name={store.name}
                        category="Mat & dryck"
                        logoUrl={store.imageUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title block truncate">{store.name}</span>
                        <span className="ui-row-subtitle block truncate">
                          {[
                            store.chainName || 'Matbutik',
                            store.dist ? `${store.dist} km` : undefined,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 text-[11px] font-display font-semibold tabular-nums">
                        {store.offerCount} erbjudanden
                      </span>
                      <CaretRight size={13} className="text-[var(--text-muted)]" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-10 text-center">
                  <Storefront size={32} weight="light" className="ui-empty-icon mb-1.5" />
                  <p className="text-xs font-medium text-[var(--text-secondary)]">
                    Inga butiker hittades för detta val
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        /* FLIK 2: HITTA BILLIGASTE VARA I NÄRLIGGANDE BUTIKER */
        <div className="space-y-3">
          {/* Sorteringsval (Billigast pris / Lägst jmf-pris / Närmast butik) */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {offerSearch.trim()
                ? `${filteredOffers.length} träffar på "${offerSearch.trim()}" nära ${coords.label}`
                : `${filteredOffers.length} extrapriser nära ${coords.label}`}
            </span>

            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'price', label: 'Billigast' },
                  { id: 'comprice', label: 'Jmf-pris' },
                  { id: 'distance', label: 'Närmast' },
                ] as const
              ).map((opt) => {
                const active = dealSortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDealSortBy(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                        : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {offerCategories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {offerCategories.map((cat) => {
                const active = selectedOfferCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedOfferCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 transition-all cursor-pointer ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                        : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}

          <section className="ui-list-card">
            {loadingMultiOffers ? (
              <div className="py-10 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <ArrowsClockwise size={15} className="animate-spin" />
                <span>Samlar veckans bästa priser nära {coords.label}...</span>
              </div>
            ) : filteredOffers.length > 0 ? (
              filteredOffers.slice(0, 100).map((offer, idx) => {
                const imgUrl =
                  offer.produkt_bild_urls?.thumbnailUrl || offer.produkt_bild_urls?.bildUrl;
                const prodName = offer.product?.name || 'Vara';
                const brand = offer.product?.brand;
                const volume = offer.volume;
                const isCheapestMatch = idx === 0 && offerSearch.trim().length > 0;
                const { shortBadgeCondition, longNoticeText } = splitOfferTexts(offer);

                return (
                  <button
                    key={`${offer.key || offer.id}-${idx}`}
                    type="button"
                    onClick={() => setSelectedOfferDetail(offer)}
                    className="w-full py-3 flex items-start justify-between gap-3 text-left hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-white border border-[var(--border-subtle)] p-1 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={prodName}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <Tag size={16} className="text-emerald-600" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isCheapestMatch && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9.5px] font-bold uppercase tracking-wide shrink-0">
                              Billigast nära dig
                            </span>
                          )}
                          <span className="ui-row-title block truncate">{prodName}</span>
                        </div>
                        <span className="ui-row-subtitle block truncate">
                          {[
                            offer.storeName,
                            offer.storeDist ? `${offer.storeDist} km` : undefined,
                            brand,
                            volume,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {offer.comprice && (
                          <span className="text-[10.5px] text-[var(--text-muted)] block mt-0.5 tabular-nums truncate">
                            Jmf-pris {offer.comprice}
                            {offer.regular ? ` · Ord. ${offer.regular}` : ''}
                          </span>
                        )}
                        {longNoticeText && (
                          <span className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-1 break-words flex items-center gap-1">
                            <Info size={11} className="text-[var(--text-muted)] shrink-0" />
                            <span className="truncate">{longNoticeText}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 max-w-[104px] flex flex-col items-end">
                      {shortBadgeCondition && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-0.5 truncate max-w-full">
                          {shortBadgeCondition}
                        </span>
                      )}
                      <span
                        className={`inline-block px-2.5 py-1 rounded-xl font-display font-bold text-xs tabular-nums whitespace-nowrap ${
                          isCheapestMatch
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {offer.price}
                      </span>
                      {offer.requiresMembershipCard && (
                        <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                          Medlemspris
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-10 text-center">
                <Tag size={32} weight="light" className="ui-empty-icon mb-1.5" />
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Inga varor hittades
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* BottomSheet för erbjudandedetalj & långa villkorstexter i huvudvyn */}
      <BottomSheet
        isOpen={!!selectedOfferDetail}
        onClose={() => setSelectedOfferDetail(null)}
        maxWidthClass="max-w-md"
      >
        {selectedOfferDetail && (() => {
          const detailImg =
            selectedOfferDetail.produkt_bild_urls?.bildUrl ||
            selectedOfferDetail.produkt_bild_urls?.thumbnailUrl;
          const detailName = selectedOfferDetail.product?.name || 'Erbjudande';
          const { shortBadgeCondition, longNoticeText } = splitOfferTexts(selectedOfferDetail);
          const rawCond = (selectedOfferDetail.condition || '').trim();
          const rawDesc = (selectedOfferDetail.description || '').trim();

          return (
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-[var(--border-subtle)] p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                    {detailImg ? (
                      <img
                        src={detailImg}
                        alt={detailName}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Tag size={24} className="text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-base text-[var(--text-primary)] leading-snug break-words">
                      {detailName}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 break-words">
                      {[
                        selectedOfferDetail.storeName,
                        selectedOfferDetail.storeDist
                          ? `${selectedOfferDetail.storeDist} km`
                          : undefined,
                        selectedOfferDetail.product?.brand,
                        selectedOfferDetail.volume,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOfferDetail(null)}
                  className="ui-icon-btn shrink-0"
                  aria-label="Stäng"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              {/* Pris & villkorskort */}
              <div className="rounded-xl bg-[var(--bg-color)]/60 border border-[var(--border-subtle)] p-3.5 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-[var(--text-muted)] block">Kampanjpris</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    {shortBadgeCondition && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {shortBadgeCondition}
                      </span>
                    )}
                    <span className="font-display font-bold text-lg text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {selectedOfferDetail.price}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-[var(--text-secondary)] space-y-0.5">
                  {selectedOfferDetail.comprice && (
                    <div className="tabular-nums">Jmf-pris: {selectedOfferDetail.comprice}</div>
                  )}
                  {selectedOfferDetail.regular && (
                    <div className="text-[var(--text-muted)] tabular-nums">
                      Ord. pris: {selectedOfferDetail.regular}
                    </div>
                  )}
                  {selectedOfferDetail.requiresMembershipCard && (
                    <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Kräver medlemskap
                    </div>
                  )}
                </div>
              </div>

              {/* Fullständig villkors- eller beskrivningstext (t.ex. "Gäller ej Perio Gard...") */}
              {(longNoticeText || rawDesc || rawCond) && (
                <div className="rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-3.5 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                    Villkor & produktinformation
                  </span>
                  {rawCond && (
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed break-words">
                      {rawCond}
                    </p>
                  )}
                  {rawDesc && rawDesc.toLowerCase() !== rawCond.toLowerCase() && (
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed break-words">
                      {rawDesc}
                    </p>
                  )}
                </div>
              )}

              {selectedOfferDetail.storeName && (
                <button
                  type="button"
                  onClick={() => {
                    const offerToOpen = selectedOfferDetail;
                    setSelectedOfferDetail(null);
                    handleSelectOfferStore(offerToOpen);
                  }}
                  className="ui-btn-primary w-full py-2.5 flex items-center justify-center gap-1.5"
                >
                  <Storefront size={15} weight="bold" />
                  <span>Visa alla erbjudanden hos {selectedOfferDetail.storeName}</span>
                </button>
              )}
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
};
