import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import {
  acceptBody,
  adminListQuery,
  adminSummaryQuery,
  createRequestBody,
  customerListQuery,
  idParams,
  rejectBody,
  seenBody,
} from "./requests.schemas.js";
import * as service from "./requests.service.js";

// ---- customer: /api/requests
export const requestsRouter = Router();
requestsRouter.use(requireAuth, requireRole("customer"));

// Per account, not per IP: several customers may share one office connection.
const createLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  keyGenerator: (req) => `u:${req.user.id}`,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { message: "Too many requests, slow down", code: "RATE_LIMITED" } },
});

requestsRouter.get("/", validate(customerListQuery, "query"), async (req, res) => {
  res.json(await service.listForCustomer(req.user.id, req.valid.query));
});

requestsRouter.post("/", createLimiter, validate(createRequestBody), async (req, res) => {
  const { request, created } = await service.createRequest(req.user, req.valid.body);
  res.status(created ? 201 : 200).json({ data: request });
});

requestsRouter.get("/unseen", async (req, res) => {
  res.json({ data: await service.listUnseen(req.user.id) });
});

requestsRouter.post("/seen", validate(seenBody), async (req, res) => {
  res.json({ updated: await service.markSeen(req.user.id, req.valid.body.ids) });
});

requestsRouter.post("/:id/cancel", validate(idParams, "params"), async (req, res) => {
  res.json({ data: await service.cancelRequest(req.user, req.valid.params.id) });
});

// ---- admin: /api/admin/requests
export const adminRequestsRouter = Router();
adminRequestsRouter.use(requireAuth, requireRole("admin"));

adminRequestsRouter.get("/", validate(adminListQuery, "query"), async (req, res) => {
  res.json(await service.listForAdmin(req.valid.query));
});

adminRequestsRouter.get("/summary", validate(adminSummaryQuery, "query"), async (req, res) => {
  res.json({ data: await service.adminSummary(req.valid.query) });
});

adminRequestsRouter.post(
  "/:id/accept",
  validate(idParams, "params"),
  validate(acceptBody),
  async (req, res) => {
    res.json({ data: await service.acceptRequest(req.user, req.valid.params.id, req.valid.body) });
  },
);

adminRequestsRouter.post(
  "/:id/reject",
  validate(idParams, "params"),
  validate(rejectBody),
  async (req, res) => {
    res.json({ data: await service.rejectRequest(req.user, req.valid.params.id, req.valid.body) });
  },
);
