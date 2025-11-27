import app from "../src/server";
import serverless from "serverless-http";
import { VercelRequest, VercelResponse } from "@vercel/node";

const handler = serverless(app);

export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
