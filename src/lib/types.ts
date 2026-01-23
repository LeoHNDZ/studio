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
  id:string;
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type Ticket = {
  id: string;
  name: string;
  backgroundImageUrl: string | null;
  texts: TextElement[];
  canvasWidth: number;
  canvasHeight: number;
  createdAt: number;
  contactId?: string | null;
};
