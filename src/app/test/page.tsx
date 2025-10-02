'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestPage() {
  const [ok, setOk] = useState<string>('…');

  useEffect(() => {
    (async () => {
      const { error } = await supabase.from('teams').select('id').limit(1);
      setOk(error ? `Error: ${error.message}` : 'Supabase connection OK');
    })();
  }, []);

  return <div className="text-sm">{ok}</div>;
}
