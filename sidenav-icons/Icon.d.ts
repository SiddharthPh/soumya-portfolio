import * as React from 'react';
export type IconName =
  | "ChecklistMd"
  | "DockToRightMd"
  | "EventNoteMd"
  | "FastfoodMd"
  | "GroupMdStroke"
  | "InsertChartMd"
  | "KeyboardArrowDown"
  | "KeyboardArrowUp"
  | "LanMdStroke"
  | "LocationOnMdStroke"
  | "SettingsMdStroke"
  | "SettingsRemoteMd"
  | "ShieldPersonMd"
  | "WebhookMd";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number | string;
}
export declare const Icon: React.FC<IconProps>;
export default Icon;
