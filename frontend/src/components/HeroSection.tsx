"use client";

import React from "react";
import { Globe } from "@/components/ui/cobe-globe";
import { Globe as GlobeIcon, Shield, Lock, CheckCircle2 } from "lucide-react";

const markers = [
  { id: "sf", location: [37.7595, -122.4367] as [number, number], label: "San Francisco" },
  { id: "nyc", location: [40.7128, -74.006] as [number, number], label: "New York" },
  { id: "tokyo", location: [35.6762, 139.6503] as [number, number], label: "Tokyo" },
  { id: "london", location: [51.5074, -0.1278] as [number, number], label: "London" },
  { id: "sydney", location: [-33.8688, 151.2093] as [number, number], label: "Sydney" },
  { id: "capetown", location: [-33.9249, 18.4241] as [number, number], label: "Cape Town" },
  { id: "dubai", location: [25.2048, 55.2708] as [number, number], label: "Dubai" },
  { id: "paris", location: [48.8566, 2.3522] as [number, number], label: "Paris" },
  { id: "saopaulo", location: [-23.5505, -46.6333] as [number, number], label: "São Paulo" },
];

const arcs = [
  {
    id: "sf-tokyo",
    from: [37.7595, -122.4367] as [number, number],
    to: [35.6762, 139.6503] as [number, number],
    label: "SF → Tokyo",
  },
  {
    id: "nyc-london",
    from: [40.7128, -74.006] as [number, number],
    to: [51.5074, -0.1278] as [number, number],
    label: "NYC → London",
  },
  {
    id: "london-dubai",
    from: [51.5074, -0.1278] as [number, number],
    to: [25.2048, 55.2708] as [number, number],
    label: "London → Dubai",
  },
  {
    id: "paris-saopaulo",
    from: [48.8566, 2.3522] as [number, number],
    to: [-23.5505, -46.6333] as [number, number],
    label: "Paris → São Paulo",
  },
];

export function HeroSection() {
  return (
    <section className="relative w-full border-b border-zinc-200 bg-gradient-to-b from-zinc-50/50 via-white to-white overflow-hidden py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Heading & Content */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 border border-zinc-300 text-zinc-800 text-xs font-medium shadow-xs">
              <GlobeIcon className="h-3.5 w-3.5 text-zinc-600" />
              <span>Global Image Footprint and Tamper-Evident Search</span>
            </div>

            {/* Title */}
            <h1 className="font-title text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-950 leading-tight">
              Trace Any Photo Across the Public Web
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-zinc-600 leading-relaxed font-normal max-w-2xl mx-auto lg:mx-0">
              Upload an image to discover matching public webpages, social media posts, and visual copies across the open internet. Export cryptographic SHA-256 and Merkle proofs directly for blockchain verification.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs text-zinc-700 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-zinc-800" />
                <span>Image Footprint (Not Person ID)</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 shadow-xs">
                <Shield className="h-3.5 w-3.5 text-zinc-800" />
                <span>AI Synthetic Screening</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 shadow-xs">
                <Lock className="h-3.5 w-3.5 text-zinc-800" />
                <span>SHA-256 & Merkle Proofs</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Cobe Globe */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            {/* Globe Canvas Container */}
            <div className="w-full max-w-[420px] aspect-square relative flex items-center justify-center cursor-grab active:cursor-grabbing">
              <Globe
                markers={markers}
                arcs={arcs}
                markerColor={[0.15, 0.2, 0.35]}
                baseColor={[1, 1, 1]}
                arcColor={[0.2, 0.35, 0.8]}
                glowColor={[0.93, 0.94, 0.96]}
                dark={0}
                mapBrightness={10}
                markerSize={0.03}
                markerElevation={0.015}
                speed={0.0028}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
