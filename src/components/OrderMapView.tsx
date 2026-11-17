"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface OrderMapViewProps {
  lat: number;
  lng: number;
  address: string;
}

export default function OrderMapView({ lat, lng, address }: OrderMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // إنشاء الخريطة
    const map = L.map(mapRef.current).setView([lat, lng], 15);

    // إضافة طبقة الخريطة
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // إضافة علامة الموقع
    const marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    }).addTo(map);

    // إضافة نافذة منبثقة
    marker.bindPopup(`<b>موقع التوصيل</b><br/>${address}`).openPopup();

    // إضافة دائرة حول الموقع
    L.circle([lat, lng], {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      radius: 200, // 200 متر
    }).addTo(map);

    mapInstanceRef.current = map;

    // تنظيف عند الخروج
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, address]);

  // تحديث الموقع عند تغيير الإحداثيات
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15);
    }
  }, [lat, lng]);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200 shadow-md">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
