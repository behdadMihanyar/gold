import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validate } from "../../middleware/validate.js";
import {
  createOrderBody,
  idParams,
  listOrdersQuery,
  sideParams,
  summaryQuery,
  updateOrderBody,
} from "./orders.schemas.js";
import * as service from "./orders.service.js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

// GET /api/orders/:side?page=&pageSize=&date=&q=
ordersRouter.get(
  "/:side",
  validate(sideParams, "params"),
  validate(listOrdersQuery, "query"),
  async (req, res) => {
    const { side } = req.valid.params;
    const filters = req.valid.query;
    const { data, total } = await service.listOrders(side, filters);
    res.json({ data, total, page: filters.page, pageSize: filters.pageSize });
  },
);

// GET /api/orders/:side/summary?date=&q=   → { count, quantity, amount }
ordersRouter.get(
  "/:side/summary",
  validate(sideParams, "params"),
  validate(summaryQuery, "query"),
  async (req, res) => {
    res.json(await service.summarizeOrders(req.valid.params.side, req.valid.query));
  },
);

ordersRouter.get("/:side/:id", validate(idParams, "params"), async (req, res) => {
  const { side, id } = req.valid.params;
  res.json(await service.getOrder(side, id));
});

ordersRouter.post(
  "/:side",
  validate(sideParams, "params"),
  validate(createOrderBody),
  async (req, res) => {
    const order = await service.createOrder(
      req.valid.params.side,
      req.valid.body,
      req.user,
    );
    res.status(201).json(order);
  },
);

ordersRouter.patch(
  "/:side/:id",
  validate(idParams, "params"),
  validate(updateOrderBody),
  async (req, res) => {
    const { side, id } = req.valid.params;
    res.json(await service.updateOrder(side, id, req.valid.body));
  },
);

ordersRouter.delete("/:side/:id", validate(idParams, "params"), async (req, res) => {
  const { side, id } = req.valid.params;
  await service.deleteOrder(side, id);
  res.status(204).end();
});
