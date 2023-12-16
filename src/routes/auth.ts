import express from "express";
import { getAuthdUser } from "../controllers/auth";
const router = express.Router();

router.get("/user", getAuthdUser);


export default router;

