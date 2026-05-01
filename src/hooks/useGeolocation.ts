"use client";

import { useState, useEffect, useCallback } from "react";

interface GeoLocation {
  lat: number;
  lng: number;
}

interface UseGeolocationResult {
  location: GeoLocation | null;
  loading: boolean;
  error: string | null;
  needsPermission: boolean;
  requestPermission: () => void;
  denyPermission: () => void;
}

const ASKED_KEY = "moodquest_gps_asked";
const CACHE_KEY = "moodquest_gps_cache";

export function useGeolocation(): UseGeolocationResult {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("not supported");
      setLoading(false);
      return;
    }

    // Check permission state first (if API available)
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "denied") {
          // Browser has blocked GPS — user needs to unblock in browser settings
          setError("blocked");
          setLoading(false);
          localStorage.setItem(ASKED_KEY, "denied");
          return;
        }
        // prompt or granted — proceed
        doGetPosition();
      }).catch(() => {
        // permissions API not available — just try
        doGetPosition();
      });
    } else {
      doGetPosition();
    }

    function doGetPosition() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          setLoading(false);
          localStorage.setItem(ASKED_KEY, "granted");
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...loc, ts: Date.now() }));
        },
        (err) => {
          console.log("GPS error:", err.code, err.message);
          setError(err.code === 1 ? "blocked" : "denied");
          setLoading(false);
          if (err.code === 1) {
            // User denied in browser — remember
            localStorage.setItem(ASKED_KEY, "denied");
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  useEffect(() => {
    // Check cached location first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 300000) {
          setLocation({ lat: parsed.lat, lng: parsed.lng });
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    const asked = localStorage.getItem(ASKED_KEY);

    if (asked === "granted") {
      // Previously granted — get silently
      fetchLocation();
    } else if (asked === "denied") {
      // Previously denied — don't ask
      setError("denied");
      setLoading(false);
    } else {
      // First time — show our custom popup
      setNeedsPermission(true);
      setLoading(false);
    }
  }, [fetchLocation]);

  const requestPermission = useCallback(() => {
    setNeedsPermission(false);
    setLoading(true);
    // Small delay to let our popup close before browser popup appears
    setTimeout(() => fetchLocation(), 300);
  }, [fetchLocation]);

  const denyPermission = useCallback(() => {
    setNeedsPermission(false);
    setError("denied");
    localStorage.setItem(ASKED_KEY, "denied");
  }, []);

  return { location, loading, error, needsPermission, requestPermission, denyPermission };
}
