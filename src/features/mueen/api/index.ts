/**
 * The active Mu'een service. Today this is the mock; when the RAG endpoint
 * is ready, add a client here (model it on src/features/courses/api/client.ts:
 * Supabase bearer token, timeout, typed errors) and export it instead.
 */
import { mockMueenService } from "./mock-service";
import type { MueenService } from "../types";

export const mueenService: MueenService = mockMueenService;
