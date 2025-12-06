export interface MemeText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  isDragging?: boolean;
}

export interface Template {
  id: string;
  url: string;
  name: string;
}

export interface GeneratedCaption {
  text: string;
}

export enum ProcessingState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  EDITING = 'EDITING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export interface Theme {
  id: string;
  name: string;
  appBg: string;
  panelBg: string;
  headerBg: string;
  textColor: string;
  subTextColor: string;
  borderColor: string;
  accentColor: string;
  iconColor: string;
  primaryBtn: string;
  secondaryBtn: string;
  dangerBtn: string;
  canvasBg: string;
  inputBg: string;
}