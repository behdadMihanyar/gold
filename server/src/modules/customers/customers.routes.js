import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import {
  createCustomerBody,
  idParams,
  listCustomersQuery,
  updateCustomerBody,
} from "./customers.schemas.js";
import * as service from "./customers.service.js";

export const customersRouter = Router();
customersRouter.use(requireAuth, requireRole("admin"));

customersRouter.get("/", validate(listCustomersQuery, "query"), async (req, res) => {
  res.json(await service.listCustomers(req.valid.query));
});

customersRouter.post("/", validate(createCustomerBody), async (req, res) => {
  res.status(201).json({ data: await service.addCustomer(req.valid.body) });
});

customersRouter.patch(
  "/:id",
  validate(idParams, "params"),
  validate(updateCustomerBody),
  async (req, res) => {
    res.json({ data: await service.updateCustomer(req.valid.params.id, req.valid.body) });
  },
);
