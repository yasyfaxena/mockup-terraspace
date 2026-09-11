import { Router } from "express";
import { apiReference } from "@scalar/express-api-reference";
import { buildOpenApiDocument } from "./document.js";

const OPENAPI_JSON_PATH = "/openapi.json";

/**
 * `/openapi.json` — the generated spec (development-phases.md Phase 8) —
 * and `/docs`, an interactive Scalar reference reading that same URL, so
 * the two can never drift from each other.
 */
export const openApiRouter = Router();

openApiRouter.get(OPENAPI_JSON_PATH, (_req, res) => {
  res.json(buildOpenApiDocument());
});

openApiRouter.get("/docs", apiReference({ url: OPENAPI_JSON_PATH }));
