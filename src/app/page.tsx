"use client";

import { useState, useCallback, useEffect } from "react";
import { moods } from "@/data/moods";
import { TripResult as TripResultType, MissionStatus, WeatherData, AqiData, LocationWeather } from "@/types";
import { useI18n } from "@/i18n/context";
import { moodIcons, ChevronLeft, Map, Target, MessageSquare } from "@/components/Icons";
import { Trophy } from "lucide-react";
import MoodSelector from "@/components/MoodSelector";
import TripForm from "@/components/TripForm";
import TripResultView from "@/components/TripResult";
import LoadingScreen from "@/components/LoadingScreen";
import LanguageToggle from "@/components/LanguageToggle";
import { WeatherBadgeInline, WeatherCard } from "@/components/WeatherBadge";
import ActivityBanner from "@/components/ActivityBanner";
import AchievementShowcase from "@/components/AchievementShowcase";
import { useGeolocation } from "@/hooks/useGeolocation";
import LocationPermission from "@/components/LocationPermission";
import BottomNav, { type Tab } from "@/components/BottomNav";
import { useSavedTrips } from "@/hooks/useSavedTrips";
import TripsPage from "@/components/TripsPage";
import ProfilePage from "@/components/ProfilePage";
import { RouteItem } from "@/types";
import { type AreaSelection } from "@/components/AreaSelector";
import Leaderboard from "@/components/Leaderboard";
import AuthScreen from "@/components/AuthScreen";
import { useAuth } from "@/hooks/useAuth";

type Step = "mood" | "details" | "loading" | "result";

async function enrichWithGooglePlaces(items: RouteItem[], province: string): Promise<RouteItem[]> {
  const results: RouteItem[] = [...items];
  
  // Fetch place data in parallel
  const enriched = await Promise.all(
    results.map(async (item) => {
      try {
        const q = `${item.place} ${province} Thailand`;
        const res = await fetch(`/api/places?action=search&q=${encodeURIComponent(q)}`);
        if (!res.ok) return item;
        const data = await res.json();
        if (data.error) return item;
        return {
          ...item,
          place_lat: data.lat ?? undefined,
          place_lng: data.lng ?? undefined,
          place_photo_url: data.photoUrl ?? undefined,
          place_id: data.placeId ?? undefined,
        } as RouteItem;
      } catch {
        return item;
      }
    })
  );

  // Calculate distances sequentially
  for (let i = 1; i < enriched.length; i++) {
    const prev = enriched[i - 1];
    const curr = enriched[i];
    if (prev.place_lat && prev.place_lng && curr.place_lat && curr.place_lng) {
      try {
        const res = await fetch(
          `/api/places?action=distance&fromLat=${prev.place_lat}&fromLng=${prev.place_lng}&toLat=${curr.place_lat}&toLng=${curr.place_lng}&mode=walking`
        );
        if (res.ok) {
          const dist = await res.json();
          if (!dist.error) {
            enriched[i] = { ...enriched[i], distance_text: dist.distance, duration_text: dist.duration };
          }
        }
      } catch { /* ignore distance errors */ }
    }
  }
  
  return enriched;
}

export default function Home() {
  const { t, locale, moods: moodT, provinces } = useI18n();
  const auth = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("mood");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [area, setArea] = useState<AreaSelection>({ label: provinces[0], radius: 10, mode: "province" });
  const [duration, setDuration] = useState(4);
  const [budget, setBudget] = useState(800);
  const [transport, setTransport] = useState("public");
  const [placesCount, setPlacesCount] = useState(0); // 0 = auto
  const [tripResult, setTripResult] = useState<TripResultType | null>(null);
  const [missions, setMissions] = useState<MissionStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userContext, setUserContext] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [aqi, setAqi] = useState<AqiData | null>(null);
  const [locationWeather, setLocationWeather] = useState<LocationWeather | null>(null);

  const { allTrips, completedTrips, saveTrip, deleteTrip } = useSavedTrips(auth.user?.id);
  const { location: geoLocation, needsPermission, requestPermission, denyPermission, error: geoError } = useGeolocation();

  useEffect(() => {
    if (!geoLocation) return;
    const fetchLocationWeather = async () => {
      try {
        const res = await fetch(`/api/weather-location?lat=${geoLocation.lat}&lng=${geoLocation.lng}&locale=${locale}`);
        if (res.ok) {
          const data: LocationWeather = await res.json();
          setLocationWeather(data);
          setWeather({
            province: data.locationName,
            today: { date: new Date().toLocaleDateString(), maxTemp: data.maxTemp, minTemp: data.minTemp, rainPercent: data.rainPercent, descTh: data.descTh, descEn: data.descEn },
            forecasts: [],
          });
          setAqi({ aqi: data.aqi, level: data.aqiLevel, levelTh: data.aqiLevelTh, color: data.aqiColor, advice: data.aqiAdvice, adviceTh: data.aqiAdviceTh });
          setWeatherLoading(false);
        }
      } catch { /* fall through */ }
    };
    fetchLocationWeather();
  }, [geoLocation, locale]);

  useEffect(() => {
    if (locationWeather && step === "mood") return;
    const fetchByProvince = async () => {
      setWeatherLoading(true);
      try {
        const [weatherRes, aqiRes] = await Promise.allSettled([
          fetch(`/api/weather?province=${encodeURIComponent(area.label)}`),
          fetch(`/api/aqi?province=${encodeURIComponent(area.label)}`),
        ]);
        if (weatherRes.status === "fulfilled" && weatherRes.value.ok) setWeather(await weatherRes.value.json());
        if (aqiRes.status === "fulfilled" && aqiRes.value.ok) setAqi(await aqiRes.value.json());
      } catch { /* non-critical */ } finally { setWeatherLoading(false); }
    };
    fetchByProvince();
  }, [area.label, step, locationWeather]);

  const selectedMoodData = moods.find((m) => m.id === selectedMood);
  const selectedMoodLabel = selectedMood ? moodT[selectedMood as keyof typeof moodT]?.label ?? selectedMoodData?.label : "";
  const SelectedMoodIcon = selectedMood ? moodIcons[selectedMood] : null;

  const handleMoodSelect = useCallback((id: string) => {
    setSelectedMood((prev) => (prev === id ? null : id));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedMood) return;
    setStep("loading");
    setError(null);
    try {
      const moodLabel = moods.find((m) => m.id === selectedMood)?.label ?? selectedMood;
      const transportMap: Record<string, string> = { public: "ขนส่งสาธารณะ", walk: "เดิน", car: "รถยนต์", bike: "จักรยาน", boat: "เรือ" };
      const res = await fetch("/api/generate-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: moodLabel, province: area.label, duration_hours: duration, budget,
          transport_mode: transportMap[transport] ?? transport, locale,
          user_context: userContext.trim() || undefined,
          places_count: placesCount || undefined,
          radius_km: area.radius,
          area_lat: area.lat,
          area_lng: area.lng,
          weather_info: weather?.today ? `${weather.today.descTh} อุณหภูมิ ${weather.today.minTemp}-${weather.today.maxTemp}°C โอกาสฝนตก ${weather.today.rainPercent}%` : undefined,
        }),
      });
      if (!res.ok) throw new Error(`${t.serverError} (${res.status})`);
      const data: TripResultType = await res.json();
      if (data && data.route_items) {
        // Enrich with Google Places data (photos, coords, distances)
        const enrichedItems = await enrichWithGooglePlaces(data.route_items, area.label);
        const enrichedData = { ...data, route_items: enrichedItems };
        setTripResult(enrichedData);
        setMissions(enrichedData.route_items.map((_, i) => ({ index: i, completed: false })));
        setStep("result");
      } else throw new Error(t.invalidFormat);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t.genericError);
      setStep("details");
    }
  }, [selectedMood, area, duration, budget, transport, locale, t, userContext, weather]);

  const handleCompleteMission = useCallback((index: number, photoUrl?: string) => {
    setMissions((prev) => prev.map((m) => (m.index === index ? { ...m, completed: true, photoUrl, verified: !!photoUrl } : m)));
  }, []);

  const handleReset = useCallback(() => {
    setStep("mood"); setSelectedMood(null); setArea({ label: provinces[0], radius: 10, mode: "province" });
    setDuration(4); setBudget(800); setTransport("public"); setPlacesCount(0);
    setTripResult(null); setMissions([]); setError(null);
    setUserContext(""); setAqi(null); setLocationWeather(null);
    setActiveTab("home"); setViewingSaved(false);
  }, [provinces]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab === "home") {
      // Only reset if not viewing a result
      if (step !== "result") handleReset();
      else { setStep("mood"); setSelectedMood(null); setTripResult(null); setMissions([]); }
    }
  }, [handleReset, step]);

  const handleSaveTrip = useCallback(() => {
    if (!tripResult) return;
    saveTrip(tripResult, missions);
    setActiveTab("trips");
    // Reset to mood step so user can create new trip
    setStep("mood");
    setSelectedMood(null);
    setTripResult(null);
    setMissions([]);
  }, [tripResult, missions, saveTrip]);

  const [viewingSaved, setViewingSaved] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [showGpsPopup, setShowGpsPopup] = useState(false);

  const handleViewTrip = useCallback((trip: TripResultType, savedMissions: MissionStatus[]) => {
    setTripResult(trip);
    setMissions(savedMissions);
    setStep("result");
    setActiveTab("home");
    setViewingSaved(true);
  }, []);

  const allCompleted = missions.length > 0 && missions.every((m) => m.completed);
  const stepNumber = step === "mood" ? 1 : step === "details" ? 2 : step === "result" ? 3 : 2;

  // Center button content based on current step
  // When expanded (mood selected or details), renders as full-width pill
  // When not expanded (no mood selected), renders as round FAB
  const isExpanded = (step === "mood" && !!selectedMood) || step === "details" || step === "result";

  // Auth gate — must be after all hooks
  if (auth.loading) {
    return <div className="min-h-dvh flex items-center justify-center bg-white"><div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: "#6366F1", borderTopColor: "transparent" }} /></div>;
  }
  if (!auth.user) {
    return (
      <AuthScreen
        error={authError}
        onLoginEmail={async (email, password) => {
          try { setAuthError(null); await auth.loginWithEmail(email, password); }
          catch (e) { setAuthError(e instanceof Error ? e.message : "Login failed"); }
        }}
        onSignupEmail={async (name, email, password) => {
          try { setAuthError(null); await auth.signupWithEmail(name, email, password); }
          catch (e) { setAuthError(e instanceof Error ? e.message : "Signup failed"); }
        }}
        onLoginProvider={async (provider) => {
          try { setAuthError(null); await auth.loginWithProvider(provider); }
          catch (e) { setAuthError(e instanceof Error ? e.message : "Login failed"); }
        }}
      />
    );
  }

  const centerButtonContent = (() => {
    const isEn = locale === "en";

    if (step === "mood" && selectedMood) {
      return (
        <button
          onClick={() => setStep("details")}
          className={isExpanded
            ? "w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-white text-[15px] font-semibold transition-all duration-300 active:scale-[0.98]"
            : "w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-200 active:scale-90"
          }
          style={{
            background: `linear-gradient(135deg, var(--color-primary), ${selectedMoodData?.color ?? "#818CF8"})`,
            boxShadow: "0 6px 24px rgba(99, 102, 241, 0.35)",
          }}
        >
          {SelectedMoodIcon && <SelectedMoodIcon size={isExpanded ? 20 : 26} strokeWidth={2} />}
          {isExpanded && <span>{t.tripWith} {selectedMoodLabel} →</span>}
        </button>
      );
    }
    if (step === "details") {
      return (
        <button
          onClick={handleGenerate}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-white text-[15px] font-semibold transition-all duration-300 active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, var(--color-primary), ${selectedMoodData?.color ?? "#818CF8"})`,
            boxShadow: "0 6px 24px rgba(99, 102, 241, 0.35)",
          }}
        >
          <Target size={20} strokeWidth={2} />
          <span>{t.generateBtn}</span>
        </button>
      );
    }
    if (step === "result" && !viewingSaved) {
      return (
        <button
          onClick={handleSaveTrip}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-white text-[15px] font-semibold transition-all duration-300 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #10B981, #14B8A6)",
            boxShadow: "0 6px 24px rgba(16, 185, 129, 0.35)",
          }}
        >
          <Map size={20} strokeWidth={2} />
          <span>{t.saveTrip}</span>
        </button>
      );
    }
    // Default: Board button (no mood selected)
    return (
      <button
        onClick={() => setBoardOpen(true)}
        className="w-16 h-16 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-90"
        style={{
          background: "linear-gradient(135deg, #F59E0B, #FBBF24)",
          boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
          border: "3px solid white",
        }}
      >
        <Trophy size={20} strokeWidth={2} color="white" />
        <span className="text-[8px] font-bold text-white leading-none">BOARD</span>
      </button>
    );
  })();

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Header */}
      <header
        className="sticky top-0 z-50 safe-top"
        style={{
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid var(--color-border-light)",
        }}
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {step !== "mood" && step !== "loading" && (
              <button
                onClick={() => step === "details" ? setStep("mood") : step === "result" ? handleReset() : null}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "var(--color-surface-3)" }}
                aria-label={t.back}
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366F1, #818CF8)" }}>
                <Map size={16} strokeWidth={2} color="white" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold leading-none">{t.appName}</h1>
                <p className="text-[10px] font-medium leading-none mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{t.appSub}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {step !== "loading" && (
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: s === stepNumber ? 20 : 6, background: s <= stepNumber ? "var(--color-primary)" : "var(--color-border)", opacity: s <= stepNumber ? 1 : 0.4 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
        {/* Step: Mood */}
        {step === "mood" && activeTab === "home" && (
          <div>
            <div className="mb-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold mb-1">
                {t.heroTitle1}<br />
                <span style={{ color: "var(--color-primary)" }}>{t.heroTitle2}</span>
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{t.heroSub}</p>
              <div className="mt-2">
                <WeatherBadgeInline weather={weather} aqi={aqi} loading={weatherLoading}
                  currentTemp={locationWeather?.currentTemp}
                  locationName={locale === "en" ? locationWeather?.locationNameEn : locationWeather?.locationName}
                />
              </div>
            </div>

            {/* Activity Banner Slider */}
            <ActivityBanner />

            <MoodSelector moods={moods} selected={selectedMood} onSelect={handleMoodSelect} />

            {/* User Context Input */}
            {selectedMood && (
              <div className="mt-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                <div className="app-card p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#6366F110" }}>
                      <MessageSquare size={15} strokeWidth={1.8} style={{ color: "#6366F1" }} />
                    </span>
                    {t.contextLabel}
                  </label>
                  <p className="text-[12px] mb-2.5" style={{ color: "var(--color-text-tertiary)" }}>{t.contextHint}</p>
                  <textarea
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder={t.contextPlaceholder}
                    rows={3}
                    className="w-full rounded-xl p-3 text-sm resize-none outline-none transition-all duration-200 focus:ring-2"
                    style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border-light)", color: "var(--color-text)" }}
                  />
                </div>
              </div>
            )}

            {/* Achievement Showcase */}
            <AchievementShowcase allTrips={allTrips} completedTrips={completedTrips} />

            {/* Spacer for bottom nav */}
            <div className="h-24" />
          </div>
        )}

        {/* Step: Details */}
        {step === "details" && activeTab === "home" && (
          <div>
            <div className="mb-5 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3" style={{ background: `${selectedMoodData?.color ?? "#6366F1"}10` }}>
                {SelectedMoodIcon && <SelectedMoodIcon size={16} strokeWidth={2} style={{ color: selectedMoodData?.color }} />}
                <span className="text-sm font-semibold" style={{ color: selectedMoodData?.color }}>{selectedMoodLabel}</span>
              </div>
              <h2 className="text-xl font-bold mb-0.5">{t.setupTitle}</h2>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{t.setupSub}</p>
            </div>

            <div className="mb-4">
              <WeatherCard weather={weather} aqi={aqi} loading={weatherLoading} />
            </div>

            {error && (
              <div className="app-card p-4 mb-4 animate-fade-in flex items-start gap-3" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
                <span className="text-base">⚠</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#DC2626" }}>{error}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#EF4444" }}>{t.errorRetry}</p>
                </div>
              </div>
            )}

            <TripForm
              area={area} duration={duration} budget={budget} transport={transport} placesCount={placesCount}
              geoLat={geoLocation?.lat} geoLng={geoLocation?.lng}
              onAreaChange={setArea} onDurationChange={setDuration}
              onBudgetChange={setBudget} onTransportChange={setTransport} onPlacesCountChange={setPlacesCount}
              onRequestGps={() => setShowGpsPopup(true)}
            />

            {/* Spacer for bottom nav */}
            <div className="h-24" />
          </div>
        )}

        {/* Step: Loading */}
        {step === "loading" && <LoadingScreen />}

        {/* Step: Result */}
        {step === "result" && activeTab === "home" && tripResult && (
          <div>
            <TripResultView
              trip={tripResult} missions={missions}
              onCompleteMission={handleCompleteMission}
              onSave={handleSaveTrip}
              onRecalculate={handleGenerate}
              allCompleted={allCompleted}
              transport={transport}
              isSaved={viewingSaved}
            />
            <div className="h-20" />
          </div>
        )}

        {/* Tab: Trips */}
        {activeTab === "trips" && step !== "result" && (
          <TripsPage
            trips={allTrips}
            onViewTrip={handleViewTrip}
            onDelete={deleteTrip}
          />
        )}

        {/* Tab: Completed */}
        {activeTab === "list" && step !== "result" && (
          <TripsPage
            trips={completedTrips}
            onViewTrip={handleViewTrip}
            onDelete={deleteTrip}
            showCompleted
          />
        )}

        {/* Tab: Profile */}
        {activeTab === "profile" && (
          <ProfilePage allTrips={allTrips} completedTrips={completedTrips} userName={auth.user?.name} userEmail={auth.user?.email} userId={auth.user?.id} geoLat={geoLocation?.lat} geoLng={geoLocation?.lng} onLogout={auth.logout} />
        )}
      </main>

      {/* Bottom Navigation — hide during loading and saved trip view */}
      {step !== "loading" && !viewingSaved && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          centerButton={centerButtonContent}
          showCenter={true}
          expanded={isExpanded}
        />
      )}

      {/* Leaderboard */}
      <Leaderboard
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        myBadges={completedTrips.length}
        myCarbonG={0}
      />

      {/* Location Permission Popup */}
      {(needsPermission || showGpsPopup || (geoError === "blocked" && !geoLocation)) && (
        <LocationPermission
          onAllow={() => { setShowGpsPopup(false); requestPermission(); }}
          onDeny={() => { setShowGpsPopup(false); denyPermission(); }}
          blocked={geoError === "blocked"}
        />
      )}
    </div>
  );
}
