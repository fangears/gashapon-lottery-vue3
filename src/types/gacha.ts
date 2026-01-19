export type Timezone = "Asia/Shanghai" | "America/Los_Angeles" | "America/Las_Vegas";

export interface Prize {
  id: string;
  name: string;
  description?: string;
  stock: number;
  imageUrl?: string;
  weight: number;
  needEmail?: boolean;
}

export interface GachaConfig {
  requireSocialAccount: boolean;
  useStockAsWeight: boolean;
  timezone: Timezone;
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
