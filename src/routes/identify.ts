import { Router } from "express";
import { identifyContact } from "../services/identityService";

const router = Router();

router.post("/identify", identifyContact);

export default router;