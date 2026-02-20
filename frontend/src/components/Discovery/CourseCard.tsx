import React from 'react';
import { Course } from './types';

const truncate = (s = '', n = 120) =>
  s.length > n ? `${s.slice(0, n).trim()}…` : s;

export const CourseCard: React.FC<{ course: Course; onClick?: () => void }> = ({
  course,
  onClick,
}) => {
  return (
    <article className="course-card" onClick={onClick} style={{cursor: onClick ? 'pointer' : 'default'}}>
      <div style={{display: 'flex', gap: 12}}>
        <img
          src={course.thumbnail || '/placeholder-course.png'}
          alt={course.title}
          loading="lazy"
          style={{width: 120, height: 72, objectFit: 'cover', borderRadius: 6}}
        />
        <div style={{flex: 1}}>
          <h3 style={{margin: 0, fontSize: 16}}>{course.title}</h3>
          <div style={{fontSize: 12, color: '#666', marginTop: 6}}>
            {course.provider && <span>{course.provider} · </span>}
            {course.duration && <span>{course.duration} · </span>}
            {course.rating && <span>★ {course.rating.toFixed(1)}</span>}
          </div>
          <p style={{margin: '8px 0 0', fontSize: 13, color: '#333'}}>{truncate(course.description)}</p>
          <div style={{marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap'}}>
            {(course.tags || []).slice(0, 4).map((t) => (
              <span key={t} style={{background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: 12}}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
};

export default CourseCard;
