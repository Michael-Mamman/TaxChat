import type { Request, Response } from "express";
import { decryptRequest, encryptResponse, FlowEndpointException } from "../services/whatsapp/whatsapp.flow.encryption.js";
import { PASSPHRASE } from "../config.js";

const FLOW_PRIVATE_KEY = process.env.FLOW_PRIVATE_KEY || "";
const FLOW_PASSPHRASE = PASSPHRASE;

export const flowSetup = async (req: Request, res: Response) => {
  try {
    if (!FLOW_PRIVATE_KEY) {
      throw new Error("Flow private key is not configured");
    }

    const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptRequest(
      req.body,
      FLOW_PRIVATE_KEY,
      FLOW_PASSPHRASE || "",
    );

    const { screen, data, version, action, flow_token } = decryptedBody;

    // Handle health check / ping
    if (action === "ping") {
      const responseData = {
        version,
        data: { status: "active" },
      };
      return res.send(encryptResponse(responseData, aesKeyBuffer, initialVectorBuffer));
    }

    // Handle INIT action
    if (action === "INIT") {
      const responseData = {
        version,
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: { flow_token },
          },
        },
      };
      return res.send(encryptResponse(responseData, aesKeyBuffer, initialVectorBuffer));
    }

    // Handle data exchange
    if (action === "data_exchange") {
      // TODO: Implement flow-specific data exchange logic
      const responseData = {
        version,
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: { flow_token, status: "completed" },
          },
        },
      };
      return res.send(encryptResponse(responseData, aesKeyBuffer, initialVectorBuffer));
    }

    // Default response
    const responseData = {
      version,
      screen: "SUCCESS",
      data: {},
    };
    return res.send(encryptResponse(responseData, aesKeyBuffer, initialVectorBuffer));
  } catch (err) {
    if (err instanceof FlowEndpointException) {
      return res.status(err.statusCode).send();
    }
    console.error("Flow endpoint error:", err);
    return res.status(500).send();
  }
};
