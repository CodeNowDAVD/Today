export type PresentationSessionItem = {
  fileId: number;
  category?: string;
  order: number;
};

export type PresentationSession = {
  id: string;
  title: string;
  subtitle?: string;
  items: PresentationSessionItem[];
  createdAt: string;
  updatedAt: string;
};
