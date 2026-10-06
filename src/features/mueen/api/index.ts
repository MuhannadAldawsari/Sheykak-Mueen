/**
 * The active Mu'een service: the live client (Supabase Edge Function `mueen-draft`,
 * see live-service.ts). The mock in mock-service.ts returns the design's sample answer.
 */
import { liveMueenService } from "./live-service";
import type { MueenService } from "../types";

export const mueenService: MueenService = liveMueenService;
