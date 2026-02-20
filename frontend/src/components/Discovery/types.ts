export interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
  thumbnail?: string;
  duration?: string;
  provider?: string;
  rating?: number;
  tags?: string[];
}

export type SortOption = 'relevance' | 'newest' | 'popular' | 'duration';
