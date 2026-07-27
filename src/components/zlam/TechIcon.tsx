import React from 'react';

type TechKey =
  | 'react'
  | 'vue'
  | 'angular'
  | 'nextjs'
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
  | 'tailwindcss'
  | 'laravel'
  | 'django'
  | 'flask';

const techColorMap: Record<TechKey, string> = {
  react: '#61DAFB',
  vue: '#4FC08D',
  angular: '#DD0031',
  nextjs: '#000000',
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
  tailwindcss: '#06B6D4',
  laravel: '#FF2D20',
  django: '#092E20',
  flask: '#000000',
};

const techIdMap: Record<TechKey, string> = {
  react: 'react',
  vue: 'vue.js',
  angular: 'angular',
  nextjs: 'next.js',
  nodejs: 'node.js',
  express: 'express',
  mongodb: 'mongodb',
  postgresql: 'postgresql',
  mysql: 'mysql',
  redis: 'redis',
  elasticsearch: 'elasticsearch',
  docker: 'docker',
  kubernetes: 'kubernetes',
  aws: 'amazonaws',
  firebase: 'firebase',
  graphql: 'graphql',
  typescript: 'typescript',
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  go: 'go',
  tailwindcss: 'tailwindcss',
  laravel: 'laravel',
  django: 'django',
  flask: 'flask',
};

const resolveTechKey = (raw: string): TechKey | undefined => {
  const value = raw.toLowerCase();
  if (value.includes('react')) return 'react';
  if (value.includes('vue')) return 'vue';
  if (value.includes('angular')) return 'angular';
  if (value.includes('next.js') || value.includes('nextjs')) return 'nextjs';
  if (value.includes('node')) return 'nodejs';
  if (value.includes('express')) return 'express';
  if (value.includes('mongo')) return 'mongodb';
  if (value.includes('postgres')) return 'postgresql';
  if (value.includes('mysql')) return 'mysql';
  if (value.includes('redis')) return 'redis';
  if (value.includes('elastic')) return 'elasticsearch';
  if (value.includes('docker')) return 'docker';
  if (value.includes('kubernetes') || value.includes('k8s')) return 'kubernetes';
  if (value.includes('aws')) return 'aws';
  if (value.includes('firebase')) return 'firebase';
  if (value.includes('graphql')) return 'graphql';
  if (value.includes('typescript')) return 'typescript';
  if (value.includes('javascript') || value.includes('js')) return 'javascript';
  if (value.includes('python')) return 'python';
  if (value.includes('java')) return 'java';
  if (value.includes('golang') || value === 'go') return 'go';
  if (value.includes('tailwind')) return 'tailwindcss';
  if (value.includes('laravel')) return 'laravel';
  if (value.includes('django')) return 'django';
  if (value.includes('flask')) return 'flask';
  return undefined;
};

const initials = (raw: string) => raw.slice(0, 2).toUpperCase();

const TechIcon: React.FC<{ tech?: string; className?: string }> = ({ tech, className }) => {
  if (!tech) return null;
  const key = resolveTechKey(tech);
  const color = key ? techColorMap[key] : '#6B7280';

  if (key) {
    const iconId = techIdMap[key];
    const src = `https://cdn.simpleicons.org/${iconId}/${color.replace('#', '')}`;
    return (
      <img
        src={src}
        alt={tech}
        title={tech}
        className={`inline-flex items-center justify-center rounded-md bg-white/90 p-1 ${className || ''}`}
        style={{ width: 28, height: 28 }}
        loading="lazy"
      />
    );
  }

  const text = '#FFFFFF';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md text-[10px] font-bold leading-none px-1.5 py-1 ${className || ''}`}
      style={{ backgroundColor: color, color: text }}
      title={tech}
    >
      {initials(tech)}
    </span>
  );
};

export default TechIcon;
