import React, { useEffect, useState } from 'react';
import { Course } from './types';
import CourseCard from './CourseCard';

export const Recommendations: React.FC<{ max?: number }> = ({ max = 6 }) => {
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/recommendations')
      .then((r) => r.ok ? r.json() : [])
      .then((data: Course[]) => { if (mounted) setItems((data || []).slice(0, max)); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [max]);

  if (loading) return <div>Loading recommendations…</div>;
  if (!items.length) return <div>No recommendations yet</div>;

  return (
    <section>
      <h4>Recommended for you</h4>
      <div style={{display: 'flex', gap: 12, overflowX: 'auto', padding: '8px 0'}}>
        {items.map((c) => (
          <div key={c.id} style={{minWidth: 320}}>
            <CourseCard course={c} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default Recommendations;
