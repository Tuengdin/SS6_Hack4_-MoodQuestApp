"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { MapPin, X, Shield } from "lucide-react";

interface LocationPermissionProps {
  onAllow: () => void;
  onDeny: () => void;
  blocked?: boolean;
}

export default function LocationPermission({ onAllow, onDeny, blocked }: LocationPermissionProps) {
  const { locale } = useI18n();
  const isEn = locale === "en";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}>
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-scale-in" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        {/* Icon */}
        <div className="pt-8 pb-4 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366F115, #818CF815)" }}>
              <MapPin size={36} strokeWidth={1.5} style={{ color: "#6366F1" }} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center bg-white" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <Shield size={16} strokeWidth={2} style={{ color: "#10B981" }} />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="px-6 pb-6 text-center">
          <h3 className="text-[18px] font-bold mb-2">
            {isEn ? "Enable Location" : "เปิดใช้ตำแหน่ง"}
          </h3>
          <p className="text-[14px] leading-relaxed mb-1" style={{ color: "var(--color-text-secondary)" }}>
            {isEn
              ? "MoodQuest uses your location to:"
              : "MoodQuest ใช้ตำแหน่งของคุณเพื่อ:"}
          </p>
          <div className="text-left space-y-2 mt-3 mb-5">
            {[
              isEn ? "Show weather & air quality nearby" : "แสดงสภาพอากาศและคุณภาพอากาศใกล้เคียง",
              isEn ? "Find places within your radius" : "ค้นหาสถานที่ในรัศมีของคุณ",
              isEn ? "Verify mission check-ins" : "ยืนยันการเช็คอินภารกิจ",
              isEn ? "Find nearby friends" : "หาเพื่อนใกล้เคียง",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#6366F110" }}>
                  <span className="text-[10px] font-bold" style={{ color: "#6366F1" }}>✓</span>
                </div>
                <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{text}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] mb-5" style={{ color: "var(--color-text-tertiary)" }}>
            {isEn
              ? "Your location is never shared with other users. You can change this in settings anytime."
              : "ตำแหน่งของคุณจะไม่ถูกแชร์กับผู้ใช้คนอื่น สามารถเปลี่ยนได้ในการตั้งค่า"}
          </p>

          {/* Buttons */}
          <div className="space-y-2">
            {blocked ? (
              <>
                <div className="px-4 py-3 rounded-xl text-[13px] text-left mb-2" style={{ background: "#FEF3C7", color: "#92400E" }}>
                  {isEn
                    ? "Location is blocked by your browser. To enable: click the lock icon 🔒 in the address bar → allow Location."
                    : "ตำแหน่งถูกบล็อกโดยเบราว์เซอร์ วิธีเปิด: กดไอคอนแม่กุญแจ 🔒 ที่แถบ URL → อนุญาตตำแหน่ง"}
                </div>
                <button onClick={onDeny}
                  className="w-full py-3 rounded-2xl text-[14px] font-medium transition-all active:scale-[0.98]"
                  style={{ color: "var(--color-text-tertiary)" }}>
                  {isEn ? "OK" : "ตกลง"}
                </button>
              </>
            ) : (
              <>
                <button onClick={onAllow}
                  className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #6366F1, #818CF8)", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
                  {isEn ? "Allow Location" : "อนุญาตตำแหน่ง"}
                </button>
                <button onClick={onDeny}
                  className="w-full py-3 rounded-2xl text-[14px] font-medium transition-all active:scale-[0.98]"
                  style={{ color: "var(--color-text-tertiary)" }}>
                  {isEn ? "Not now" : "ไม่ใช่ตอนนี้"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
