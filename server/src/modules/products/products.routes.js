import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { updateProductBody } from "../prices/prices.schemas.js";
import { z } from "zod";
import { getBoard, updateProduct } from "./products.service.js";

const idParams = z.object({ id: z.coerce.number().int().positive() });

// GET /api/products — the price board. Customers get the public view; admins also
// see inactive products and the collector ids still waiting to be mapped.
export const productsRouter = Router();
productsRouter.use(requireAuth);
productsRouter.get("/", async (req, res) => {
  res.json(await getBoard({ admin: req.user.role === "admin" }));
});

// PATCH /api/admin/products/:id — manual prices, visibility, collector mapping.
export const adminProductsRouter = Router();
adminProductsRouter.use(requireAuth, requireRole("admin"));
adminProductsRouter.patch(
  "/:id",
  validate(idParams, "params"),
  validate(updateProductBody),
  async (req, res) => {
    res.json({ data: await updateProduct(req.valid.params.id, req.valid.body) });
  },
);
