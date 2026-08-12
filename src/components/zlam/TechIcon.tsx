import React from 'react';

type TechKey =
  | 'react'
  | 'vue'
  | 'angular'
  | 'nextdotjs'
  | 'nodejs'
  | 'express'
  | 'mongodb'
  | 'postgresql'
  | 'mysql'
  | 'redis'
  | 'elasticsearch'
  | 'docker'
  | 'kubernetes'
  | 'aws'
  | 'firebase'
  | 'graphql'
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'go'
  | 'goland'
  | 'tailwindcss'
  | 'laravel'
  | 'django'
  | 'flask'
  | 'framer'
  | 'gsap'
  | 'lenis'
  | 'lucide'
  | 'sharp'
  | 'cva'
  | 'vite'
  | 'vercel'
  | 'supabase';

const techBrandColorMap: Record<TechKey, string> = {
  react: '#61DAFB',
  vue: '#4FC08D',
  angular: '#DD0031',
  nextdotjs: '#000000',
  nodejs: '#339933',
  express: '#000000',
  mongodb: '#47A248',
  postgresql: '#4169E1',
  mysql: '#4479A1',
  redis: '#DC382D',
  elasticsearch: '#FEC514',
  docker: '#2496ED',
  kubernetes: '#326CE5',
  aws: '#FF9900',
  firebase: '#FFCA28',
  graphql: '#E10098',
  typescript: '#3178C6',
  javascript: '#F7DF1E',
  python: '#3776AB',
  java: '#007396',
  go: '#00ADD8',
  goland: '#000000',
  tailwindcss: '#06B6D4',
  laravel: '#FF2D20',
  django: '#092E20',
  flask: '#000000',
  framer: '#0055FF',
  gsap: '#88CE02',
  lenis: '#00D4AA',
  lucide: '#000000',
  sharp: '#000000',
  cva: '#000000',
  vite: '#646CFF',
  vercel: '#000000',
  supabase: '#3ECF8E',
};

const normalize = (raw: string): string => {
  const text = String(raw)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9+.# -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lower = text.toLowerCase();
  const nonTechPhrases = [
    'profile information',
    'experience entries',
    'social links',
    'certifications',
    'skills categorized',
    'transitions',
    'and scroll reveals',
  ];
  if (nonTechPhrases.some((phrase) => lower.includes(phrase))) {return '';}
  if (/^(and|or|the|for|with|without|using|via|including|excluding|likely|potentially|complementing)$/i.test(text)) {return '';}
  if (text.length < 2) {return '';}
  return text;
};

const resolveTechKey = (raw: string): TechKey | undefined => {
  const cleaned = normalize(raw);
  if (!cleaned) {return undefined;}
  const value = cleaned.toLowerCase();

  if (value.includes('framer motion')) {return 'framer';}
  if (value.includes('gsap')) {return 'gsap';}
  if (value.includes('lenis')) {return 'lenis';}
  if (value.includes('lucide')) {return 'lucide';}
  if (value.includes('react icons')) {return 'react';}
  if (value.includes('class-variance-authority') || value.includes('cva')) {return 'cva';}
  if (value.includes('clsx')) {return 'cva';}
  if (value.includes('tailwind-merge') || value.includes('tailwindcss-animate')) {return 'tailwindcss';}
  if (value.includes('sharp')) {return 'sharp';}
  if (value.includes('vite')) {return 'vite';}
  if (value.includes('vercel')) {return 'vercel';}
  if (value.includes('supabase')) {return 'supabase';}
  if (value.includes('vue')) {return 'vue';}
  if (value.includes('angular')) {return 'angular';}
  if (value.includes('next.js') || value.includes('nextjs')) {return 'nextdotjs';}
  if (value.includes('goland')) {return 'goland';}
  if (value.includes('node')) {return 'nodejs';}
  if (value.includes('express')) {return 'express';}
  if (value.includes('mongo')) {return 'mongodb';}
  if (value.includes('postgres')) {return 'postgresql';}
  if (value.includes('mysql')) {return 'mysql';}
  if (value.includes('redis')) {return 'redis';}
  if (value.includes('elastic')) {return 'elasticsearch';}
  if (value.includes('docker')) {return 'docker';}
  if (value.includes('kubernetes') || value.includes('k8s')) {return 'kubernetes';}
  if (value.includes('aws')) {return 'aws';}
  if (value.includes('firebase')) {return 'firebase';}
  if (value.includes('graphql')) {return 'graphql';}
  if (value.includes('typescript')) {return 'typescript';}
  if (value.includes('javascript') || value.includes('js only')) {return 'javascript';}
  if (value.includes('python')) {return 'python';}
  if (value.includes('java ') || value === 'java') {return 'java';}
  if (value.includes('golang') || value === 'go') {return 'go';}
  if (value.includes('tailwind')) {return 'tailwindcss';}
  if (value.includes('laravel')) {return 'laravel';}
  if (value.includes('django')) {return 'django';}
  if (value.includes('flask')) {return 'flask';}
  return undefined;
};

// simple-icons is ESM; sync import bundles it — no async chunk, icons instant.
import * as si from 'simple-icons';

const simpleIconMap = (() => {
  const map = new Map<string, { svg: string; hex: string }>();
  for (const key of Object.keys(si)) {
    if (key.startsWith('si')) {
      const icon = (si as any)[key];
      if (icon?.svg && typeof icon.svg === 'string') {
        map.set(key, { svg: icon.svg, hex: icon.hex || '#000000' });
      }
    }
  }
  return map;
})();

function toSimpleIconKey(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// Black-branded icons (Next.js, Express, Vercel, plain JS, etc.) are invisible on dark bg.
// Give them a light tint — brand stays recognizable, but actually shows up.
const resolveBrandColor = (key: TechKey): string => {
  const brand = techBrandColorMap[key] || '#6B7280';
  const parsed = /^#([0-9a-f]{6})$/i.exec(brand);
  if (!parsed) {return brand;}
  const n = parseInt(parsed[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // Near-black (low luminance) → light gray so it shows on dark theme.
  if (r + g + b < 120) {return '#d1d5db';}
  return brand;
};

const TechIcon: React.FC<{ tech?: string; className?: string }> = ({ tech, className }) => {
  if (!tech) {return null;}
  const key = resolveTechKey(tech);

  // Real brand icon: theme-neutral tile sized by className.
  if (key) {
    const icon = simpleIconMap.get(`si${toSimpleIconKey(key)}Icon`) || simpleIconMap.get(`si${toSimpleIconKey(key)}`);
    if (icon) {
      return (
        <span
          className={`inline-flex items-center justify-center rounded-md bg-surface-glass-regular ${className || ''}`}
          title={tech}
          dangerouslySetInnerHTML={{
            __html: icon.svg.replace('<svg ', `<svg fill="currentColor" style="color:${resolveBrandColor(key)};width:100%;height:100%;" `),
          }}
        />
      );
    }
  }

  // Unknown brand (JWT, "AI Service", etc.) — still a real icon: first letter on a dot-tile.
  // (Not a placeholder box; matches the canvas' glass chips.)
  const letter = tech.slice(0, 2).toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-surface-glass-regular text-muted-foreground ${className || ''}`}
      title={tech}
    >
      <span className="text-[10px] font-bold leading-none">{letter}</span>
    </span>
  );
};

export default TechIcon;
