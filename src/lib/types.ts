export type TextElement = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  width?: number;
  height?: number;
};

export type Contact = {
  id: string;
  name: string;
  details: string;
};

export type Ticket = {
  id: string;
  name: string;
  backgroundImageUrl: string | null;
  texts: TextElement[];
  canvasWidth: number;
  canvasHeight: number;
  createdAt: number;
};

    