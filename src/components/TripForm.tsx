"use client";

import { useI18n } from "@/i18n/context";
import { transportModes } from "@/data/moods";
import { Clock, Wallet, Rocket, transportIcons } from "./Icons";
import { Hash } from "lucide-react";
import AreaSelector, { AreaSelection } from "./AreaSelector";

interface TripFormProps {
  area: AreaSelection;
  duration: number;
  budget: number;
  transport: string;
  placesCount: number;
  geoLat?: number | null;
  geoLng?: number | null;
  onAreaChange: (v: AreaSelection) => void;
  onDurationChange: (v: number) => void;
  onBudgetChange: (v: number) => void;
  onTransportChange: (v: string) => void;
  onPlacesCountChange: (v: number) => void;
  onRequestGps?: () => void;
}

const placesOptions = [0, 3, 4, 5, 6, 7, 8];

export default function TripForm({
  area, duration, budget, transport, placesCount, geoLat, geoLng,
  onAreaChange, onDurationChange, onBudgetChange, onTransportChange, onPlacesCountChange, onRequestGps,
}: TripFormProps) {
  const { t, transports } = useI18n();

  return (
    <div className="space-y-4">
      {/* Area */}
      <div className="app-card p-4 animate-fade-in-up delay-1">
        <AreaSelector value={area} onChange={onAreaChange} geoLat={geoLat} geoLng={geoLng} onRequestGps={onRequestGps} />
      </div>

      {/* Duration */}
      <div className="app-card p-4 animate-fade-in-up delay-2">
        <label className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F59E0B10" }}>
              <Clock size={15} strokeWidth={1.8} style={{ color: "#F59E0B" }} />
            </span>
            {t.time}
          </span>
          <span className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
            {duration} <span className="text-sm font-normal" style={{ color: "var(--color-text-tertiary)" }}>{t.hours}</span>
          </span>
        </label>
        <input type="range" min={2} max={10} value={duration} onChange={(e) => onDurationChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, var(--color-primary) ${((duration - 2) / 8) * 100}%, var(--color-border-light) ${((duration - 2) / 8) * 100}%)`, accentColor: "var(--color-primary)" }} />
        <div className="flex justify-between text-[11px] mt-1.5" style={{ color: "var(--color-text-tertiary)" }}>
          <span>2 {t.hr}</span><span>10 {t.hr}</span>
        </div>
      </div>

      {/* Budget */}
      <div className="app-card p-4 animate-fade-in-up delay-3">
        <label className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#10B98110" }}>
              <Wallet size={15} strokeWidth={1.8} style={{ color: "#10B981" }} />
            </span>
            {t.budgetLabel}
          </span>
          <span className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
            {budget.toLocaleString()} <span className="text-sm font-normal" style={{ color: "var(--color-text-tertiary)" }}>{t.baht}</span>
          </span>
        </label>
        <input type="range" min={200} max={5000} step={100} value={budget} onChange={(e) => onBudgetChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, var(--color-success) ${((budget - 200) / 4800) * 100}%, var(--color-border-light) ${((budget - 200) / 4800) * 100}%)`, accentColor: "var(--color-success)" }} />
        <div className="flex justify-between text-[11px] mt-1.5" style={{ color: "var(--color-text-tertiary)" }}>
          <span>200</span><span>5,000</span>
        </div>
      </div>

      {/* Places Count */}
      <div className="app-card p-4 animate-fade-in-up delay-4">
        <label className="flex items-center gap-2 text-sm font-semibold mb-3">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EC489910" }}>
            <Hash size={15} strokeWidth={1.8} style={{ color: "#EC4899" }} />
          </span>
          {t.placesCountLabel}
        </label>
        <div className="flex flex-wrap gap-2">
          {placesOptions.map((n) => (
            <button key={n} onClick={() => onPlacesCountChange(n)} className="pill-btn text-[13px]"
              style={{ background: placesCount === n ? "var(--color-primary)" : "var(--color-surface-3)", color: placesCount === n ? "white" : "var(--color-text-secondary)", padding: "8px 16px", minWidth: 48 }}>
              {n === 0 ? t.placesCountAuto : n}
            </button>
          ))}
        </div>
      </div>

      {/* Transport */}
      <div className="app-card p-4 animate-fade-in-up delay-5">
        <label className="flex items-center gap-2 text-sm font-semibold mb-3">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#8B5CF610" }}>
            <Rocket size={15} strokeWidth={1.8} style={{ color: "#8B5CF6" }} />
          </span>
          {t.transportLabel}
        </label>
        <div className="grid grid-cols-5 gap-2">
          {transportModes.map((tm) => {
            const TIcon = transportIcons[tm.id];
            return (
              <button key={tm.id} onClick={() => onTransportChange(tm.id)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200"
                style={{ background: transport === tm.id ? "var(--color-primary)" : "var(--color-surface-3)", color: transport === tm.id ? "white" : "var(--color-text-secondary)" }}>
                {TIcon && <TIcon size={20} strokeWidth={1.8} />}
                <span className="text-[10px] font-medium">{transports[tm.id as keyof typeof transports]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
