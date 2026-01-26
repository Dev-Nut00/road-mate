"use client";

import { useEffect, useRef, useState } from "react";

interface NaverMapProps {
    center?: { lat: number; lng: number };
    zoom?: number;
    className?: string;
    markers?: { lat: number; lng: number; title: string }[];
}

export default function NaverMap({ center, zoom = 15, className, markers = [] }: NaverMapProps) {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null); // Stores the Naver Map instance
    const markersRef = useRef<any[]>([]); // Stores active markers
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize Map Only Once
    useEffect(() => {
        if (!mapElement.current) return;

        // Check if map is already initialized
        if (mapRef.current) return;

        const initMap = () => {
            if (!window.naver || !window.naver.maps) {
                return;
            }

            try {
                const location = new window.naver.maps.LatLng(
                    center?.lat || 37.5665,
                    center?.lng || 126.9780
                );

                const mapOptions = {
                    center: location,
                    zoom: zoom,
                    zoomControl: true,
                    zoomControlOptions: {
                        position: window.naver.maps.Position.TOP_RIGHT,
                    },
                };

                const map = new window.naver.maps.Map(mapElement.current, mapOptions);
                mapRef.current = map;
                setIsLoaded(true);
                console.log("Naver Map initialized");
            } catch (err) {
                console.error("Failed to initialize Naver Map:", err);
            }
        };

        if (window.naver && window.naver.maps) {
            initMap();
        } else {
            const interval = setInterval(() => {
                if (window.naver && window.naver.maps) {
                    initMap();
                    clearInterval(interval);
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, []); // Empty dependency array to ensure run once

    // Handle Updates (Center, Zoom)
    useEffect(() => {
        if (!mapRef.current || !window.naver || !window.naver.maps) return;

        const map = mapRef.current;
        const newCenter = new window.naver.maps.LatLng(
            center?.lat || 37.5665,
            center?.lng || 126.9780
        );

        map.setCenter(newCenter);
        map.setZoom(zoom);
    }, [center, zoom]);

    // Handle Markers
    useEffect(() => {
        if (!mapRef.current || !window.naver || !window.naver.maps) return;

        const map = mapRef.current;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Add new markers
        markers.forEach((m) => {
            const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(m.lat, m.lng),
                map: map,
                title: m.title
            });
            markersRef.current.push(marker);
        });

    }, [markers]); // Re-run only when markers array changes

    return (
        <div ref={mapElement} className={className || "w-full h-full bg-gray-100"}>
            {!isLoaded && <div className="flex items-center justify-center h-full text-gray-400 text-sm">지도를 불러오는 중...</div>}
        </div>
    );
}
