"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/i18n/context";
import { MapPin, Navigation, Map, Crosshair } from "lucide-react";
import { districtsByProvince } from "@/data/districts";
import dynamic from "next/dynamic";

const PinMap = dynamic(() => import("./PinMap"), { ssr: false });

type AreaMode = "gps" | "province" | "district" | "map";

export interface AreaSelection {
  label: string;
  lat?: number;
  lng?: number;
  radius: number;
  mode: AreaMode;
}

interface AreaSelectorProps {
  value: AreaSelection;
  onChange: (v: AreaSelection) => void;
  geoLat?: number | null;
  geoLng?: number | null;
  onRequestGps?: () => void;
}

export default function AreaSelector({ value, onChange, geoLat, geoLng, onRequestGps }: AreaSelectorProps) {
  const { t, provinces, locale } = useI18n();
  const isEn = locale === "en";
  const [mode, setMode] = useState<AreaMode>(value.mode);
  const [showMap, setShowMap] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState(provinces[0]);

  // Get districts for selected province
  const currentDistricts = districtsByProvince[selectedProvince] || [];

  const handleModeChange = useCallback((m: AreaMode) => {
    setMode(m);
    if (m === "gps" && geoLat && geoLng) {
      onChange({
        label: isEn ? "Current location" : "โลเคชั่นปัจจุบัน",
        lat: geoLat, lng: geoLng,
        radius: value.radius, mode: "gps",
      });
    } else if (m === "map") {
      setShowMap(true);
    }
  }, [geoLat, geoLng, isEn, onChange, value.radius]);

  const handleProvinceSelect = useCallback((p: string) => {
    setSelectedProvince(p);
    onChange({ label: p, radius: value.radius, mode: "province" });
  }, [onChange, value.radius]);

  const handleDistrictSelect = useCallback((d: string) => {
    onChange({ label: `${selectedProvince} - ${d}`, radius: value.radius, mode: "district" });
  }, [onChange, selectedProvince, value.radius]);

  const handleRadiusChange = useCallback((r: number) => {
    onChange({ ...value, radius: r });
  }, [onChange, value]);

  const handleMapPin = useCallback((lat: number, lng: number) => {
    onChange({
      label: isEn ? `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})` : `ปักหมุด (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat, lng, radius: value.radius, mode: "map",
    });
    setShowMap(false);
  }, [isEn, onChange, value.radius]);

  // Order: GPS → Province → District → Map
  const modes: { id: AreaMode; icon: typeof MapPin; label: string }[] = [
    { id: "gps", icon: Crosshair, label: t.areaCurrentLocation as string },
    { id: "province", icon: Map, label: t.areaProvince as string },
    { id: "district", icon: Navigation, label: t.areaDistrict as string },
    { id: "map", icon: MapPin, label: t.areaMapPin as string },
  ];

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className="flex items-center gap-2 text-sm font-semibold">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#6366F110" }}>
          <MapPin size={15} strokeWidth={1.8} style={{ color: "#6366F1" }} />
        </span>
        {t.area}
      </label>

      {/* Mode tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button key={m.id} onClick={() => handleModeChange(m.id)}
              className="pill-btn gap-1.5 flex-shrink-0 text-[12px]"
              style={{
                background: active ? "var(--color-primary)" : "var(--color-surface-3)",
                color: active ? "white" : "var(--color-text-secondary)",
                padding: "7px 14px",
              }}>
              <Icon size={13} strokeWidth={2} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* GPS */}
      {mode === "gps" && (
        <div className="animate-fade-in">
          {geoLat && geoLng ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#10B98110", color: "#059669" }}>
              <Crosshair size={16} strokeWidth={2} />
              <div>
                <span className="text-[13px] font-semibold block">{isEn ? "Using your location" : "ใช้ตำแหน่งปัจจุบัน"}</span>
                <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{geoLat.toFixed(4)}, {geoLng.toFixed(4)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#FEF3C7", color: "#92400E" }}>
              <Crosshair size={16} strokeWidth={2} />
              <span className="text-[13px] flex-1">{isEn ? "Location not available" : "ไม่สามารถระบุตำแหน่งได้"}</span>
              {onRequestGps && (
                <button onClick={onRequestGps}
                  className="pill-btn text-[11px] gap-1 flex-shrink-0"
                  style={{ background: "#6366F1", color: "white", padding: "6px 12px" }}>
                  <MapPin size={12} strokeWidth={2} />
                  {isEn ? "Enable GPS" : "เปิด GPS"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Province */}
      {mode === "province" && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {provinces.map((p) => (
            <button key={p} onClick={() => handleProvinceSelect(p)}
              className="pill-btn text-[13px]"
              style={{
                background: value.label === p && value.mode === "province" ? "var(--color-primary)" : "var(--color-surface-3)",
                color: value.label === p && value.mode === "province" ? "white" : "var(--color-text-secondary)",
                padding: "8px 16px",
              }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* District — province selector + districts */}
      {mode === "district" && (
        <div className="space-y-2 animate-fade-in">
          {/* Province selector */}
          <div className="flex flex-wrap gap-1.5">
            {provinces.map((p) => (
              <button key={p} onClick={() => setSelectedProvince(p)}
                className="pill-btn text-[11px]"
                style={{
                  background: selectedProvince === p ? "var(--color-primary)" : "var(--color-surface-3)",
                  color: selectedProvince === p ? "white" : "var(--color-text-tertiary)",
                  padding: "5px 12px",
                }}>
                {p}
              </button>
            ))}
          </div>
          {/* Districts for selected province */}
          {currentDistricts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {currentDistricts.map((d) => (
                <button key={d} onClick={() => handleDistrictSelect(d)}
                  className="pill-btn text-[13px]"
                  style={{
                    background: value.label.includes(d) && value.mode === "district" ? "var(--color-primary)" : "var(--color-surface-3)",
                    color: value.label.includes(d) && value.mode === "district" ? "white" : "var(--color-text-secondary)",
                    padding: "8px 16px",
                  }}>
                  {d}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[12px] px-2" style={{ color: "var(--color-text-tertiary)" }}>
              {isEn ? "No districts available for this province" : "ไม่มีข้อมูลเขต/อำเภอสำหรับจังหวัดนี้"}
            </p>
          )}
        </div>
      )}

      {/* Map pin */}
      {mode === "map" && showMap && (
        <div className="rounded-2xl overflow-hidden animate-fade-in" style={{ height: 220 }}>
          <PinMap initialLat={geoLat || 13.7563} initialLng={geoLng || 100.5018} onPin={handleMapPin} />
        </div>
      )}
      {mode === "map" && !showMap && value.mode === "map" && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl animate-fade-in" style={{ background: "#6366F110" }}>
          <div className="flex items-center gap-2">
            <MapPin size={16} strokeWidth={2} style={{ color: "var(--color-primary)" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--color-primary)" }}>{value.label}</span>
          </div>
          <button onClick={() => setShowMap(true)} className="text-[12px] font-medium" style={{ color: "var(--color-primary)" }}>
            {isEn ? "Change" : "เปลี่ยน"}
          </button>
        </div>
      )}

      {/* Radius slider */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold">{t.radiusLabel as string}</span>
          <span className="text-[15px] font-bold" style={{ color: "var(--color-primary)" }}>
            {value.radius} <span className="text-[12px] font-normal" style={{ color: "var(--color-text-tertiary)" }}>{t.radiusKm as string}</span>
          </span>
        </div>
        <input type="range" min={1} max={30} value={value.radius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--color-primary) ${((value.radius - 1) / 29) * 100}%, var(--color-border-light) ${((value.radius - 1) / 29) * 100}%)`,
            accentColor: "var(--color-primary)",
          }} />
        <div className="flex justify-between text-[11px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
          <span>1 {t.radiusKm as string}</span>
          <span>30 {t.radiusKm as string}</span>
        </div>
      </div>
    </div>
  );
}
