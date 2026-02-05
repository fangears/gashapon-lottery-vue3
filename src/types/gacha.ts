export type Timezone = "Asia/Shanghai" | "America/Las_Vegas";

export interface Prize {
  id: string;
  name: string;
  description?: string;
  stock: number;
  /** 是否在 Lucky Winners（气泡榜）中展示该奖品的中奖记录。默认 true。 */
  showInLuckyWinners?: boolean;
  /**
   * 图片引用：
   * - 新版：存储图片库的 id（文件名）
   * - 旧版兼容：也可能是 dataURL（data:image/...）
   */
  imageUrl?: string;
  weight: number;
  needEmail?: boolean;
}

export interface GachaConfig {
  requireSocialAccount: boolean;
  useStockAsWeight: boolean;
  timezone: Timezone;
  /** 胶片/屏保展示用图片：存储图片库 id 列表（按顺序展示） */
  filmImageIds: string[];
  /** 屏保展示用图片：存储图片库 id 列表（按顺序展示） */
  screensaverImageIds: string[];
  prizes: Prize[];
}

export interface GachaRecord {
  id: string;
  socialAccount?: string;
  prizeId: string;
  prizeName: string;
  email?: string;
  drawnAt: number;
}
