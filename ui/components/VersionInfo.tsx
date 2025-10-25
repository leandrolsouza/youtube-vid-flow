'use client';

import { useEffect, useState } from 'react';
import { Code } from 'lucide-react';

interface VersionData {
  frontend: string;
  backend: string;
}

export function VersionInfo() {
  const [versions, setVersions] = useState<VersionData>({ frontend: '1.0.0', backend: 'Loading...' });

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        setVersions({
          frontend: '1.0.0', // From package.json
          backend: data.version || '1.0.0'
        });
      })
      .catch(() => {
        setVersions({ frontend: '1.0.0', backend: '1.0.0' });
      });
  }, []);

  return (
    <div className="px-2 py-3 text-center">
      <div className="flex items-center justify-center mb-2">
        <Code className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
        <div>UI: v{versions.frontend}</div>
        <div>API: v{versions.backend}</div>
      </div>
    </div>
  );
}